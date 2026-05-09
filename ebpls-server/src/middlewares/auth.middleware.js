// =================================================================
// File: src/middlewares/auth.middleware.js
// Purpose: Verifies the JWT on every protected request, resolves the
//          user's current role from the database, and attaches a
//          hydrated req.user object for downstream use.
//
// Architecture:
//   - The JWT is issued by Supabase Auth and signed with the project's
//     JWT secret (env.JWT_SECRET = SUPABASE_JWT_SECRET from your project settings).
//   - After verification, we resolve the user's live role from public.users
//     joined with public.roles. This ensures a role change by an Admin takes
//     effect immediately without requiring token rotation.
//   - is_active is checked on every request. Deactivated users are blocked
//     instantly without requiring token expiry.
//
// Policy (backend-developer.md — Implicit Deny):
//   - Every failure path returns 401. No information is leaked about why
//     the token was rejected (expired vs. invalid vs. user deactivated).
//   - req.user is NEVER set if auth fails — downstream code can always
//     assume req.user is fully populated when it is present.
//
// req.user shape (once populated):
//   {
//     userId:   string (UUID),
//     email:    string,
//     roleId:   number,
//     roleName: string  — one of the ROLES constants
//   }
// =================================================================

const jwt            = require('jsonwebtoken');
const env            = require('../config/env');
const { supabaseAdmin } = require('../config/supabase');
const { errorResponse }  = require('../utils/helpers');
const { ERROR_CODES }    = require('../utils/constants');

/**
 * Express middleware. Verifies JWT, resolves role from DB, attaches req.user.
 * Fails closed with 401 on any auth failure.
 */
const authenticate = async (req, res, next) => {
  try {
    // ---------------------------------------------------------------
    // STEP 1: Extract the Bearer token from the Authorization header.
    // Expected format: "Authorization: Bearer <token>"
    // ---------------------------------------------------------------
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(
        errorResponse(ERROR_CODES.UNAUTHORIZED, 'Authentication required.')
      );
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json(
        errorResponse(ERROR_CODES.UNAUTHORIZED, 'Authentication required.')
      );
    }

    // ---------------------------------------------------------------
    // STEP 2: Resolve user identity from the access token.
    //
    // Primary path:
    //   - verify JWT locally using env.JWT_SECRET for low latency
    //
    // Fallback path:
    //   - if local verification fails (e.g. JWT secret mismatch), call
    //     Supabase Auth getUser(token) and trust the returned user id.
    //
    // This keeps local dev resilient when env.JWT_SECRET drifts from the
    // Supabase project JWT secret.
    // ---------------------------------------------------------------
    let userId = null;

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      userId = decoded.sub || null;
    } catch (jwtError) {
      const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.getUser(token);
      if (authUserError || !authUserData?.user?.id) {
        // Do not reveal whether the token is expired vs malformed.
        return res.status(401).json(
          errorResponse(ERROR_CODES.UNAUTHORIZED, 'Authentication required.')
        );
      }
      userId = authUserData.user.id;
    }

    if (!userId) {
      return res.status(401).json(
        errorResponse(ERROR_CODES.UNAUTHORIZED, 'Authentication required.')
      );
    }

    // ---------------------------------------------------------------
    // STEP 3: Resolve the live user profile from the database.
    // We join public.users with public.roles to get the role_name.
    // This ensures role changes by Admin take effect immediately.
    //
    // Using supabaseAdmin here because public.users has RLS enabled.
    // The service_role key bypasses RLS — this is an authorized server op.
    // ---------------------------------------------------------------
    const { data: userProfile, error: dbError } = await supabaseAdmin
      .from('users')
      .select(`
        user_id,
        email,
        is_active,
        roles (
          role_id,
          role_name
        ),
        taxpayers (
          taxpayer_id
        )
      `)
      .eq('user_id', userId)
      .single();

    if (dbError || !userProfile) {
      // User exists in auth.users but not in public.users (orphaned auth account).
      // ASSUMPTION: This is a data integrity edge case. Fail closed.
      console.error(`[auth.middleware] DB lookup failed for user_id: ${userId}`, dbError?.message);
      return res.status(401).json(
        errorResponse(ERROR_CODES.UNAUTHORIZED, 'Authentication required.')
      );
    }

    // ---------------------------------------------------------------
    // STEP 4: Check is_active. Deactivated users are blocked immediately.
    // An Admin can deactivate a user in real-time; this check enforces it
    // on every request without waiting for token expiry.
    // ---------------------------------------------------------------
    if (!userProfile.is_active) {
      return res.status(401).json(
        errorResponse(ERROR_CODES.UNAUTHORIZED, 'Authentication required.')
      );
    }

    // ---------------------------------------------------------------
    // STEP 5: Attach the hydrated user object to the request.
    // Downstream middleware (rbac.middleware.js) and controllers read this.
    // ---------------------------------------------------------------
    req.user = {
      userId:      userProfile.user_id,
      email:       userProfile.email,
      roleId:      userProfile.roles.role_id,
      roleName:    userProfile.roles.role_name,
      // Handle both object (1:1) and array (1:M) results from PostgREST
      taxpayerId:  userProfile.taxpayers?.taxpayer_id || userProfile.taxpayers?.[0]?.taxpayer_id || null,
    };

    return next();

  } catch (err) {
    // Catch-all: unexpected runtime error. Fail closed, do not leak details.
    console.error('[auth.middleware] Unexpected error during authentication:', err.message);
    return res.status(401).json(
      errorResponse(ERROR_CODES.UNAUTHORIZED, 'Authentication required.')
    );
  }
};

module.exports = { authenticate };
