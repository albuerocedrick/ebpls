// =================================================================
// File: src/routes/bplo.routes.js
// Purpose: BPLO module endpoints (verification workflow).
// Mounted at /api/bplo in app.js.
// =================================================================

const express = require('express');

const bploController = require('../controllers/bplo.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.BPLO_OFFICER, ROLES.ADMIN));

/**
 * @route   GET /api/bplo/applications/pending
 * @desc    Returns applications in Pending and Under Review statuses.
 * @access  BPLO_Officer, Admin
 */
router.get('/applications/pending', bploController.getPendingApplications);

/**
 * @route   PUT /api/bplo/applications/verify/:app_no
 * @desc    Updates checklist and marks an application as Verified.
 * @access  BPLO_Officer, Admin
 */
router.put('/applications/verify/:app_no', bploController.verifyApplication);

/**
 * @route   PUT /api/bplo/applications/return/:app_no
 * @desc    Returns an application with required remarks.
 * @access  BPLO_Officer, Admin
 */
router.put('/applications/return/:app_no', bploController.returnApplication);

module.exports = router;
