// =================================================================
// File: src/routes/bplo.routes.js
// Purpose: BPLO module endpoints (verification workflow).
// Mounted at /api/bplo in app.js.
// =================================================================

const express = require('express');

const bploController = require('../controllers/bplo.controller');
const correctionController = require('../controllers/correction.controller');
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
 * @route   PUT /api/bplo/applications/start-review/:app_no
 * @desc    Transitions Pending → Under Review when officer opens the verifier.
 * @access  BPLO_Officer, Admin
 */
router.put('/applications/start-review/:app_no', bploController.startReview);

/**
 * @route   PUT /api/bplo/applications/save-checklist/:app_no
 * @desc    Saves checklist progress without approving.
 * @access  BPLO_Officer, Admin
 */
router.put('/applications/save-checklist/:app_no', bploController.saveChecklist);
/**
 * @route   GET /api/bplo/applications/completed
 * @desc    Fetch all Completed applications for the BPLO Completed Queue.
 * @access  BPLO_Officer, Admin
 */
router.get('/applications/completed', bploController.getCompletedApplications);

/**
 * @route   POST /api/bplo/applications/:app_no/notify-ready
 * @desc    Send CERT_READY notification + email to applicant for a Completed application.
 * @access  BPLO_Officer, Admin
 */
router.post('/applications/:app_no/notify-ready', bploController.notifyApplicantReady);

/**
 * @route   GET /api/bplo/applications/:app_no/document/:requirement_id
 * @desc    Generate a signed download URL for a specific uploaded document.
 * @access  BPLO_Officer, Admin
 */
router.get('/applications/:app_no/document/:requirement_id', bploController.getDocumentUrl);

/**
 * @route   GET /api/bplo/applications/:app_no
 * @desc    Get detailed application info for verification view.
 * @access  BPLO_Officer, Admin
 */
router.get('/applications/:app_no', bploController.getApplicationDetails);

/**
 * @route   PUT /api/bplo/applications/review/:app_no
 * @desc    Upserts application data review sections.
 * @access  BPLO_Officer, Admin
 */
router.put('/applications/review/:app_no', bploController.reviewApplication);

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

// =================================================================
// BPLO Correction Review Routes (Phase 1 Sub-Task)
// =================================================================

/**
 * @route   GET /api/bplo/corrections/pending
 * @desc    Returns all pending correction requests for review
 * @access  BPLO_Officer, Admin
 */
router.get('/corrections/pending', correctionController.listPendingCorrectionRequests);

/**
 * @route   GET /api/bplo/corrections/:id
 * @desc    Get detailed info of a single correction request
 * @access  BPLO_Officer, Admin
 */
router.get('/corrections/:id', correctionController.getCorrectionRequestDetail);

/**
 * @route   PUT /api/bplo/corrections/:id/approve
 * @desc    Approves a correction request and updates the target table
 * @access  BPLO_Officer, Admin
 */
router.put('/corrections/:id/approve', correctionController.approveCorrectionRequest);

/**
 * @route   PUT /api/bplo/corrections/:id/reject
 * @desc    Rejects a correction request
 * @access  BPLO_Officer, Admin
 */
router.put('/corrections/:id/reject', correctionController.rejectCorrectionRequest);

module.exports = router;
