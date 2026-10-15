// =================================================================
// File: src/controllers/auth.controller.js
// Purpose: Handles all authentication operations: registration,
//          login, and password reset requests.
//
// Architecture:
//   - Supabase Auth is the sole source of truth for credentials.
//     The backend NEVER stores or hashes passwords directly.
//   - Registration flow:
//       1. Validate input via Zod (email, password, full name).
//       2. Call supabaseAdmin.auth.admin.createUser() to create
//          the auth.users entry.
//       3. The database trigger handle_new_user() (002_users.sql)
//          automatically provisions the public.users row with the
//          default 'Applicant' role.
//       4. Create the taxpayers profile row with the provided name.
//       5. Log ACCOUNT_CREATED to audit_logs.
//   - Login flow:
//       1. Validate input via Zod.
//       2. Use supabaseAdmin.auth.signInWithPassword() to authenticate.
//       3. Return the Supabase session (contains access_token and refresh_token).
//       4. The access_token is the JWT that auth.middleware.js will verify.
//   - Forgot Password flow:
//       1. Validate email via Zod.
//       2. Call supabaseAdmin.auth.admin.generateLink() for a recovery link.
//       3. Log PASSWORD_RESET to audit_logs.
//       ASSUMPTION: In Phase 9, the email.service will send this link.
//       For now, the link is returned in the API response (dev only).
//
// Policy (backend-developer.md):
//   - All client input is parsed through Zod BEFORE any DB operation.
//   - No raw error messages from Supabase are forwarded to the client.
//   - Audit logging is non-blocking (fire-and-forget after response).
// =================================================================

const { z } = require('zod');
const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');
const { supabaseAdmin } = require('../config/supabase');
const { logAction, AUDIT_ACTIONS } = require('../services/audit.service');
const { successResponse, errorResponse, getClientIp } = require('../utils/helpers');
const { ERROR_CODES, EMAIL_TRIGGERS }  = require('../utils/constants');
const { createError }  = require('../middlewares/error.middleware');
const { dispatchEmail } = require('../services/email.service');

// =================================================================
// ZOD VALIDATION SCHEMAS
// Defined once here. Re-used per handler (not inline) for clarity.
// =================================================================

const registerSchema = z.object({
  email: z.string()
    .email('A valid email address is required.'),

  password: z.string()
    .min(8,  'Password must be at least 8 characters.')
    .max(72, 'Password cannot exceed 72 characters.'), // bcrypt/Supabase limit

  firstName: z.string()
    .min(1, 'First name is required.')
    .max(100, 'First name cannot exceed 100 characters.')
    .trim(),

  lastName: z.string()
    .min(1, 'Last name is required.')
    .max(100, 'Last name cannot exceed 100 characters.')
    .trim(),

  middleName: z.string()
    .max(100, 'Middle name cannot exceed 100 characters.')
    .trim()
    .optional(),

  contactNo: z.string()
    .max(20, 'Contact number cannot exceed 20 characters.')
    .optional(),
});

const loginSchema = z.object({
  email: z.string()
    .email('A valid email address is required.'),

  password: z.string()
    .min(1, 'Password is required.'),
});

const forgotPasswordSchema = z.object({
  email: z.string()
    .email('A valid email address is required.'),
});

// Dedicated auth client for signInWithPassword.
// Important: keep this separate from supabaseAdmin so user-session auth state
// never contaminates service-role DB operations (which must bypass RLS).
const supabaseAuthClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// =================================================================
// HANDLERS
// =================================================================

/**
 * POST /api/auth/register
 * Creates a new Applicant account and taxpayer profile.
 */
const register = async (req, res, next) => {
  try {
    // -----------------------------------------------------------
    // STEP 1: Validate all client-provided input.
    // parse() throws a ZodError if validation fails — caught by
    // the global error handler in error.middleware.js (Case 1).
    // -----------------------------------------------------------
    const input = registerSchema.parse(req.body);

    // -----------------------------------------------------------
    // STEP 2: Create the auth.users entry AND generate a verification
    // link simultaneously via Supabase Admin API generateLink.
    // By using generateLink, Supabase DOES NOT send the email itself.
    // This allows us to bypass Supabase's strict email rate limits
    // and send it via our custom email engine (Ethereal/Brevo).
    // -----------------------------------------------------------
    const { data: linkData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: input.email,
      password: input.password,
      options: { redirectTo: `${env.FRONTEND_URL}/verify-success` }
    });

    if (authError) {
      // Supabase returns specific error codes. Map them to our error codes.
      if (authError.message?.toLowerCase().includes('already registered') ||
          authError.code === 'email_exists') {
        // If the user already registered but is unverified, resend their verification link gracefully
        try {
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = users?.find(u => u.email?.toLowerCase() === input.email.toLowerCase());

          if (existingUser && !existingUser.email_confirmed_at) {
            // Update password to the newly provided password
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: input.password });

            // Generate fresh verification link
            const { data: resendLinkData } = await supabaseAdmin.auth.admin.generateLink({
              type: 'magiclink',
              email: input.email,
              options: { redirectTo: `${env.FRONTEND_URL}/verify-success` }
            });

            const actionLink = resendLinkData?.properties?.action_link;
            if (actionLink) {
              dispatchEmail({
                triggerEvent: EMAIL_TRIGGERS.ACCOUNT_CREATED,
                recipientEmail: input.email,
                applicationNo: null,
                payload: {
                  name: `${input.firstName} ${input.lastName}`,
                  actionLink: actionLink
                }
              });
            }

            return res.status(200).json(
              successResponse('An unverified account with this email was found. A new verification link has been sent to your email.', {
                userId: existingUser.id,
                email: input.email,
              })
            );
          }
        } catch (checkErr) {
          console.error('[auth.controller] Error checking unconfirmed user:', checkErr.message);
        }

        return next(createError(
          'An account with this email already exists. Please log in or reset your password.',
          409,
          ERROR_CODES.CONFLICT
        ));
      }
      // Unknown Supabase auth error — log and fail closed.
      console.error('[auth.controller] Supabase createUser error:', authError.message);
      return next(createError(
        'Registration failed. Please try again.',
        500,
        ERROR_CODES.INTERNAL_ERROR
      ));
    }

    const newUserId  = linkData.user.id;
    const actionLink = linkData.properties?.action_link;

    // -----------------------------------------------------------
    // STEP 3: Create the taxpayer profile row.
    // The handle_new_user() trigger (002_users.sql) has already
    // provisioned the public.users row at this point.
    // We now insert into public.taxpayers with the provided name.
    // -----------------------------------------------------------
    const { error: taxpayerError } = await supabaseAdmin
      .from('taxpayers')
      .upsert({
        user_id:     newUserId,
        first_name:  input.firstName,
        last_name:   input.lastName,
        middle_name: input.middleName || null,
        contact_no:  input.contactNo  || null,
      }, { onConflict: 'user_id' });

    if (taxpayerError) {
      // Taxpayer insert failed — the auth.users and public.users rows
      // already exist. This is a partial failure state. Log it and
      // return a 500 so the client knows to retry.
      // ASSUMPTION: In production, a cleanup job or retry mechanism
      // should handle orphaned auth accounts without a taxpayer profile.
      console.error('[auth.controller] Taxpayer insert error:', taxpayerError.message);
      return next(createError(
        'Registration failed. Please try again.',
        500,
        ERROR_CODES.INTERNAL_ERROR
      ));
    }

    // -----------------------------------------------------------
    // STEP 4: Audit log (fire-and-forget — non-blocking).
    // -----------------------------------------------------------
    logAction({
      userId:     newUserId,
      action:     AUDIT_ACTIONS.ACCOUNT_CREATED,
      entityType: 'users',
      entityId:   newUserId,
      oldValue:   null,
      newValue:   { email: input.email, firstName: input.firstName, lastName: input.lastName },
      ipAddress:  getClientIp(req),
    });

    // -----------------------------------------------------------
    // STEP 5: Dispatch the ACCOUNT_CREATED email with the confirm link.
    // -----------------------------------------------------------
    if (actionLink) {
      dispatchEmail({
        triggerEvent:   EMAIL_TRIGGERS.ACCOUNT_CREATED,
        recipientEmail: input.email,
        applicationNo:  null,
        payload: {
          name:       `${input.firstName} ${input.lastName}`,
          actionLink: actionLink
        }
      });
    }

    // -----------------------------------------------------------
    // STEP 6: Return success. Do not return the password.
    // -----------------------------------------------------------
    return res.status(201).json(
      successResponse('Account created successfully. Please check your email to verify your account.', {
        userId: newUserId,
        email:  input.email,
      })
    );

  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/auth/login
 * Authenticates a user and returns a Supabase session (JWT + refresh token).
 */
const login = async (req, res, next) => {
  try {
    // -----------------------------------------------------------
    // STEP 1: Validate input.
    // -----------------------------------------------------------
    const input = loginSchema.parse(req.body);

    // -----------------------------------------------------------
    // STEP 2: Authenticate via Supabase Auth.
    // This validates credentials and returns a session object
    // containing the access_token (JWT) and refresh_token.
    // The access_token is what auth.middleware.js will verify.
    // -----------------------------------------------------------
    const { data: sessionData, error: authError } = await supabaseAuthClient.auth.signInWithPassword({
      email:    input.email,
      password: input.password,
    });

    if (authError || !sessionData?.session) {
      // ASSUMPTION: We return a generic 401 for both "user not found"
      // and "wrong password" to prevent user enumeration attacks.
      return res.status(401).json(
        errorResponse(ERROR_CODES.UNAUTHORIZED, 'Invalid email or password.')
      );
    }

    // -----------------------------------------------------------
    // STEP 3: Resolve the user's profile from public.users and
    // public.taxpayers for the initial payload.
    // -----------------------------------------------------------
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('user_id, email, is_active, roles(role_name), taxpayers(first_name)')
      .eq('user_id', sessionData.user.id)
      .single();

    // Reject login if the account has been deactivated by an Admin.
    if (!userProfile || !userProfile.is_active) {
      return res.status(401).json(
        errorResponse(ERROR_CODES.UNAUTHORIZED, 'This account has been deactivated. Please contact the BPLO office.')
      );
    }

    // -----------------------------------------------------------
    // STEP 4: Return session tokens and basic user info.
    // -----------------------------------------------------------
    return res.status(200).json(
      successResponse('Login successful.', {
        accessToken:  sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
        expiresAt:    sessionData.session.expires_at,
        user: {
          userId:    userProfile.user_id,
          email:     userProfile.email,
          roleName:  userProfile.roles.role_name,
          firstName: userProfile.taxpayers?.first_name || 'User',
        },
      })
    );

  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/auth/forgot-password
 * Generates a password reset link and logs the action.
 * In Phase 9, email.service will send the link via Brevo/Nodemailer.
 */
const forgotPassword = async (req, res, next) => {
  try {
    // -----------------------------------------------------------
    // STEP 1: Validate email input.
    // -----------------------------------------------------------
    const input = forgotPasswordSchema.parse(req.body);

    // -----------------------------------------------------------
    // STEP 2: Generate a recovery link via Supabase Admin API.
    // We always return a 200 response — even if the email doesn't
    // exist in the system — to prevent user enumeration attacks.
    // -----------------------------------------------------------
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type:  'recovery',
      email: input.email,
      options: { redirectTo: `${env.FRONTEND_URL}/reset-password` }
    });

    if (linkError) {
      // If the email is not found, Supabase returns an error.
      // We silently ignore it and return a generic 200.
      console.warn(`[auth.controller] forgotPassword: ${linkError.message} (email: ${input.email})`);
    }

    // -----------------------------------------------------------
    // STEP 3: Audit log (non-blocking). Only log if user was found.
    // -----------------------------------------------------------
    if (linkData?.user?.id) {
      logAction({
        userId:     linkData.user.id,
        action:     AUDIT_ACTIONS.PASSWORD_RESET,
        entityType: 'users',
        entityId:   linkData.user.id,
        oldValue:   null,
        newValue:   { resetRequested: true },
        ipAddress:  getClientIp(req),
      });
    }

    // -----------------------------------------------------------
    // STEP 4: Dispatch the PASSWORD_RESET email with the link.
    // -----------------------------------------------------------
    const actionLink = linkData?.properties?.action_link;

    if (actionLink) {
      dispatchEmail({
        triggerEvent:   EMAIL_TRIGGERS.PASSWORD_RESET,
        recipientEmail: input.email,
        applicationNo:  null,
        payload: {
          actionLink: actionLink
        }
      });
    }

    return res.status(200).json(
      successResponse('If an account exists for that email, a password reset link has been sent.')
    );

  } catch (err) {
    return next(err);
  }
};

/**
 * RESET PASSWORD
 * POST /api/auth/reset-password
 * Actual update of the password using the token from the email.
 */
const resetPassword = async (req, res, next) => {
  try {
    const { password, token } = req.body;

    if (!password || !token) {
      throw createError(400, 'Password and token are required.');
    }

    // 1. Verify the token and get the user
    // getUser() works with the access_token passed in from the frontend hash
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('[auth.controller] resetPassword token error:', userError?.message);
      throw createError(401, 'Invalid or expired reset token.');
    }

    // 2. Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateError) {
      console.error('[auth.controller] resetPassword update error:', updateError.message);
      throw createError(500, 'Failed to update password.');
    }

    return res.status(200).json(
      successResponse('Password has been updated successfully. You can now log in.')
    );

  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, forgotPassword, resetPassword };
