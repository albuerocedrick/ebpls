// =================================================================
// File: src/middlewares/rbac.middleware.js
// Purpose: Role-Based Access Control (RBAC) enforcement for all
//          protected routes. Must always be composed AFTER authenticate()
//          in the middleware chain.
//
// Architecture:
//   - Returns a middleware factory. Call authorize() with the list of
//     roles that are permitted to access the route.
//   - The role comparison uses the exact role_name strings from
//     public.roles — imported from constants.js to prevent typos.
//   - req.user.roleName is set by auth.middleware.js. If authenticate()
//     was skipped, authorize() will catch the missing req.user and fail.
//
// Usage:
//   const { authenticate }  = require('../middlewares/auth.middleware');
//   const { authorize }     = require('../middlewares/rbac.middleware');
//   const { ROLES }         = require('../utils/constants');
//
//   router.get(
//     '/api/bplo/applications/pending',
//     authenticate,
//     authorize(ROLES.BPLO_OFFICER, ROLES.ADMIN),
//     bploController.getPendingApplications
//   );
//
// Policy (backend-developer.md — Implicit Deny):
//   - Deny by default. If allowedRoles is empty, no role is permitted.
//   - Returns 403 Forbidden (not 401) — the user IS authenticated,
//     but does not have permission for this specific resource.
//   - The error message names the required roles in development mode
//     to aid debugging, but is generic in production.
// =================================================================

const { errorResponse } = require('../utils/helpers');
const { ERROR_CODES }   = require('../utils/constants');

/**
 * RBAC middleware factory.
 * Returns an Express middleware that only allows requests from users
 * whose roleName is in the provided allowedRoles list.
 *
 * @param {...string} allowedRoles - One or more role_name values from ROLES constants.
 * @returns {import('express').RequestHandler}
 *
 * @example
 * // Allow only BPLO Officers and Admins:
 * router.put('/verify/:id', authenticate, authorize(ROLES.BPLO_OFFICER, ROLES.ADMIN), handler);
 */
const authorize = (...allowedRoles) => {
  // Guard at definition time: warn if the route is configured with no roles.
  // This would create an effectively dead route (no one can access it).
  if (allowedRoles.length === 0) {
    console.warn(
      '[rbac.middleware] ⚠️  authorize() called with no roles. ' +
      'This route will be inaccessible to everyone. Add at least one role.'
    );
  }

  return (req, res, next) => {
    // ---------------------------------------------------------------
    // STEP 1: Verify req.user exists (authenticate() must run first).
    // If it is missing, this is a developer configuration error —
    // a route was protected with authorize() but not authenticate().
    // Fail closed with 401 to be safe (user is not confirmed).
    // ---------------------------------------------------------------
    if (!req.user || !req.user.roleName) {
      console.error(
        '[rbac.middleware] ❌ req.user not found. ' +
        'Ensure authenticate() middleware runs before authorize().'
      );
      return res.status(401).json(
        errorResponse(ERROR_CODES.UNAUTHORIZED, 'Authentication required.')
      );
    }

    // ---------------------------------------------------------------
    // STEP 2: Check if the user's role is in the allowed list.
    // Using Array.includes() on the spread args — O(n) on a tiny list.
    // ---------------------------------------------------------------
    const { roleName } = req.user;
    const isPermitted  = allowedRoles.includes(roleName);

    if (!isPermitted) {
      // In development, reveal which roles are required (useful for debugging).
      // In production, return a generic message to prevent role enumeration.
      const message = process.env.NODE_ENV === 'development'
        ? `Access denied. Required roles: [${allowedRoles.join(', ')}]. Your role: ${roleName}.`
        : 'You do not have permission to access this resource.';

      return res.status(403).json(
        errorResponse(ERROR_CODES.FORBIDDEN, message)
      );
    }

    // ---------------------------------------------------------------
    // STEP 3: Role check passed. Proceed to the next handler.
    // ---------------------------------------------------------------
    return next();
  };
};

module.exports = { authorize };
