// =================================================================
// File: src/routes/admin.routes.js
// Purpose: Admin module endpoints (Audit Logs, Email Logs).
// Mounted at /api/admin in app.js.
// =================================================================

const express = require('express');
const multer = require('multer');
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware handled in app.js

/**
 * @route   POST /api/admin/document-templates/:type
 * @desc    Upload a PDF document template.
 * @access  Admin
 */
router.post('/document-templates/:type', upload.single('template'), adminController.uploadDocumentTemplate);

/**
 * @route   GET /api/admin/email-logs
 * @desc    Fetch all email notifications.
 * @access  Admin
 */
router.get('/email-logs', adminController.getEmailLogs);

/**
 * @route   GET /api/admin/health
 * @desc    Fetch system health metrics (connections, storage)
 * @access  Admin
 */
router.get('/health', adminController.getHealth);

/**
 * @route   GET /api/admin/applications
 * @desc    Fetch all applications for the Master Queue
 * @access  Admin
 */
router.get('/applications', adminController.getAllApplications);

/**
 * @route   GET /api/admin/users
 * @desc    Fetch all users, their roles, and taxpayer profile info
 * @access  Admin
 */
router.get('/users', adminController.getAllUsers);

/**
 * @route   PATCH /api/admin/users/:id/status
 * @desc    Deactivate/activate a user account
 * @access  Admin
 */
router.patch('/users/:id/status', adminController.updateUserStatus);

/**
 * @route   PATCH /api/admin/users/:id/role
 * @desc    Change a user's role
 * @access  Admin
 */
router.patch('/users/:id/role', adminController.updateUserRole);

/**
 * @route   GET /api/admin/master-data/:table
 * @desc    Fetch lookup table data
 * @access  Admin
 */
router.get('/master-data/:table', adminController.getMasterData);

/**
 * @route   POST /api/admin/master-data/:table
 * @desc    Create new lookup record
 * @access  Admin
 */
router.post('/master-data/:table', adminController.createMasterData);

/**
 * @route   PUT /api/admin/master-data/:table/:id
 * @desc    Update lookup table data
 * @access  Admin
 */
router.put('/master-data/:table/:id', adminController.updateMasterData);

/**
 * @route   DELETE /api/admin/master-data/:table/:id
 * @desc    Delete lookup record
 * @access  Admin
 */
router.delete('/master-data/:table/:id', adminController.deleteMasterData);

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Fetch paginated audit logs
 * @access  Admin
 */
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
