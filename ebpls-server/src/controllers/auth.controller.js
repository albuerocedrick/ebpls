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
const { ERROR_CODES }  = require('../utils/constants');
const { createError }  = require('../middlewares/error.middleware');

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
    // STEP 2: Create the auth.users entry via Supabase Admin API.
    // email_confirm: true skips email verification for this system
    // (municipality staff register applicants directly, or applicants
    // self-register with a pre-verified flow — TBD in Phase 9).
    // ASSUMPTION: Email verification is skipped at registration.
    // The Admin can configure Supabase email confirmation settings
    // separately if required.
    // -----------------------------------------------------------
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email:             input.email,
      password:          input.password,
      email_confirm:     true,
    });

    if (authError) {
      // Supabase returns specific error codes. Map them to our error codes.
      if (authError.message?.toLowerCase().includes('already registered') ||
          authError.code === 'email_exists') {
        return next(createError(
          'An account with this email already exists.',
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

    const newUserId = authData.user.id;

    // -----------------------------------------------------------
    // STEP 3: Create the taxpayer profile row.
    // The handle_new_user() trigger (002_users.sql) has already
    // provisioned the public.users row at this point.
    // We now insert into public.taxpayers with the provided name.
    // -----------------------------------------------------------
    const { error: taxpayerError } = await supabaseAdmin
      .from('taxpayers')
      .insert({
        user_id:     newUserId,
        first_name:  input.firstName,
        last_name:   input.lastName,
        middle_name: input.middleName || null,
        contact_no:  input.contactNo  || null,
      });

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
    // STEP 5: Return success. Do not return the password.
    // -----------------------------------------------------------
    return res.status(201).json(
      successResponse('Account created successfully. You may now log in.', {
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
    // STEP 4: Return generic response.
    // In development, include the actual link for easy testing.
    // In production, Phase 9 email.service will handle delivery.
    // -----------------------------------------------------------
    const responseData = process.env.NODE_ENV === 'development' && linkData?.properties?.action_link
      ? { resetLink: linkData.properties.action_link }
      : null;

    return res.status(200).json(
      successResponse(
        'If an account exists for that email, a password reset link has been sent.',
        responseData
      )
    );

  } catch (err) {
    return next(err);
  }
};

module.exports = { register, login, forgotPassword };
