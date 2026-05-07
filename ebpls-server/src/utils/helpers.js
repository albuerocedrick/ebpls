// =================================================================
// File: src/utils/helpers.js
// Purpose: Shared utility functions used across controllers and
//          services. All functions are pure with no side effects.
// Policy:  No magic strings. No direct process.env access here.
//          Keep dependencies to zero (no imports) for maximum reuse.
// =================================================================

// -----------------------------------------------------------------
// API RESPONSE BUILDERS
// Enforces a consistent JSON response shape across all endpoints.
// Controllers should ALWAYS use these instead of raw res.json().
//
// Standard success shape:
//   { success: true, message: string, data: any }
//
// Standard error shape:
//   { success: false, code: string, message: string }
// -----------------------------------------------------------------

/**
 * Builds a standardized success response payload.
 * @param {string} message - Human-readable success message.
 * @param {any} data - The response payload (object, array, null).
 * @returns {{ success: true, message: string, data: any }}
 */
const successResponse = (message, data = null) => ({
  success: true,
  message,
  data,
});

/**
 * Builds a standardized error response payload.
 * @param {string} code    - Machine-readable error code (from ERROR_CODES).
 * @param {string} message - Human-readable error description.
 * @returns {{ success: false, code: string, message: string }}
 */
const errorResponse = (code, message) => ({
  success: false,
  code,
  message,
});

// -----------------------------------------------------------------
// IP ADDRESS EXTRACTION
// Used by audit.service.js to capture req.ip for DPA compliance.
// Handles proxies via X-Forwarded-For (e.g., Nginx, Render.com).
//
// ASSUMPTION: The server may be behind a reverse proxy that sets
// X-Forwarded-For. We take the first IP in the chain (original client).
// In production, ensure 'trust proxy' is set in Express app.js.
// -----------------------------------------------------------------

/**
 * Extracts the real client IP from a request object.
 * Checks X-Forwarded-For first, then falls back to req.ip.
 * @param {import('express').Request} req
 * @returns {string} The client IP address string.
 */
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For may contain a comma-separated list; take the first.
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
};

// -----------------------------------------------------------------
// DATE & TIME UTILITIES
// All timestamps must be server-side and timezone-aware (UTC).
// Never trust client-provided timestamps per backend policy.
// -----------------------------------------------------------------

/**
 * Returns the current UTC timestamp as an ISO 8601 string.
 * Used for consistent server-side date fields in audit logs.
 * @returns {string} e.g. "2026-05-08T01:00:00.000Z"
 */
const nowUtc = () => new Date().toISOString();

/**
 * Formats a Date object or ISO string into a readable Philippine locale
 * string (Asia/Manila timezone). Used for email content and PDF labels.
 * @param {Date|string} date
 * @returns {string} e.g. "May 8, 2026, 9:00 AM"
 */
const formatDatePH = (date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year:     'numeric',
    month:    'long',
    day:      'numeric',
    hour:     'numeric',
    minute:   '2-digit',
    hour12:   true,
  });
};

// -----------------------------------------------------------------
// PAGINATION HELPER
// Standardizes limit/offset extraction from query params.
// Prevents unbounded queries (max 100 rows per request).
// -----------------------------------------------------------------

/**
 * Parses and clamps pagination parameters from a request query string.
 * @param {import('express').Request} req
 * @returns {{ limit: number, offset: number }}
 */
const parsePagination = (req) => {
  const MAX_LIMIT = 100;
  const DEFAULT_LIMIT = 20;

  const rawLimit  = parseInt(req.query.limit,  10);
  const rawOffset = parseInt(req.query.offset, 10);

  const limit  = Number.isNaN(rawLimit)  ? DEFAULT_LIMIT : Math.min(rawLimit,  MAX_LIMIT);
  const offset = Number.isNaN(rawOffset) ? 0             : Math.max(rawOffset, 0);

  return { limit, offset };
};

module.exports = {
  successResponse,
  errorResponse,
  getClientIp,
  nowUtc,
  formatDatePH,
  parsePagination,
};
