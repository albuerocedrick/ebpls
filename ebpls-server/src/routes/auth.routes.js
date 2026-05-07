// =================================================================
// File: src/routes/auth.routes.js
// Purpose: Defines all authentication-related endpoints.
//          Maps HTTP methods and paths to the auth.controller.js handlers.
//
// Architecture:
//   - All endpoints here are PUBLIC. They do not use authenticate()
//     or authorize() middleware.
//   - Input validation (Zod) is handled inside the controller.
//   - Mounted at /api/auth in app.js.
// =================================================================

const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');

// -----------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------

/**
 * @route   POST /api/auth/register
 * @desc    Registers a new Applicant and creates a taxpayer profile.
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticates a user and returns session tokens + role.
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Generates a password reset link (sent via email in Phase 9).
 * @access  Public
 */
router.post('/forgot-password', authController.forgotPassword);

module.exports = router;
