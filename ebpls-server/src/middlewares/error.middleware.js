// =================================================================
// File: src/middlewares/error.middleware.js
// Purpose: Centralized global error handler for all Express routes.
//          Must be mounted LAST in app.js — after all routes.
//
// Architecture:
//   - Express identifies a 4-argument middleware as an error handler.
//   - Controllers and services call next(err) to route errors here.
//   - Operational errors (e.g., Zod validation failures, known 4xx
//     errors) are handled gracefully with structured responses.
//   - Unhandled/unexpected errors (5xx) are caught here as a last resort.
//
// Policy (backend-developer.md — Fail Closed):
//   - Stack traces NEVER leak in production.
//   - Error details are logged server-side for debugging.
//   - All responses use the standard errorResponse() shape for
//     consistent frontend handling.
//
// How to trigger from a controller:
//   const err = new Error('Application not found.');
//   err.statusCode = 404;
//   err.code = ERROR_CODES.NOT_FOUND;
//   return next(err);
// =================================================================

const { errorResponse } = require('../utils/helpers');
const { ERROR_CODES }   = require('../utils/constants');

/**
 * Creates a structured application error that can be passed to next().
 * Use this in controllers instead of constructing raw Error objects.
 *
 * @param {string} message    - Human-readable error description.
 * @param {number} statusCode - HTTP status code (4xx or 5xx).
 * @param {string} code       - Machine-readable code from ERROR_CODES.
 * @returns {Error}
 *
 * @example
 * const { createError } = require('../middlewares/error.middleware');
 * return next(createError('Application not found.', 404, ERROR_CODES.NOT_FOUND));
 */
const createError = (message, statusCode = 500, code = ERROR_CODES.INTERNAL_ERROR) => {
  const err   = new Error(message);
  err.statusCode = statusCode;
  err.code       = code;
  // Mark as operational — these are known, expected errors (not bugs).
  err.isOperational = true;
  return err;
};

/**
 * Zod validation error handler.
 * Formats Zod's structured errors into a flat, readable array.
 * Returns null if the error is not a Zod error.
 *
 * @param {Error} err
 * @returns {string[]|null} Array of validation messages, or null.
 */
const formatZodErrors = (err) => {
  // Zod v4 errors have a 'issues' array on the error object when thrown.
  // We check for both the name and the issues array to be safe.
  if (err.name === 'ZodError' && Array.isArray(err.issues)) {
    return err.issues.map((issue) => {
      const field = issue.path.length > 0 ? issue.path.join('.') : 'value';
      return `${field}: ${issue.message}`;
    });
  }
  return null;
};

/**
 * Express global error handler middleware.
 * Mount this AFTER all routes in app.js.
 *
 * @type {import('express').ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Always log the error server-side for debugging and incident response.
  console.error(`[error.middleware] ${req.method} ${req.originalUrl} — ${err.message}`);

  // Log full stack trace in development only.
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // ---------------------------------------------------------------
  // CASE 1: Zod Validation Error
  // Thrown when a controller calls zodSchema.parse() on invalid input.
  // ---------------------------------------------------------------
  const zodErrors = formatZodErrors(err);
  if (zodErrors) {
    return res.status(400).json({
      success: false,
      code:    ERROR_CODES.VALIDATION_ERROR,
      message: 'Validation failed.',
      errors:  zodErrors,
    });
  }

  // ---------------------------------------------------------------
  // CASE 2: Operational Error (created via createError())
  // Known, expected errors thrown intentionally by controllers/services.
  // ---------------------------------------------------------------
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json(
      errorResponse(err.code || ERROR_CODES.INTERNAL_ERROR, err.message)
    );
  }

  // ---------------------------------------------------------------
  // CASE 3: Unexpected / Programming Error
  // Unknown errors — bugs, unhandled rejections that slipped through.
  // Return a generic 500. NEVER leak internal details in production.
  // ---------------------------------------------------------------
  return res.status(500).json(
    errorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred. Please try again later.'
    )
  );
};

module.exports = { errorHandler, createError };
