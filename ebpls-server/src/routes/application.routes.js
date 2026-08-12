// =================================================================
// File: src/routes/application.routes.js
// Purpose: Route definitions for the Applicant Module.
// Policy:  Implicit Deny. Every route must be protected by authenticate.
//          RBAC enforcement applied where specific roles are required.
// =================================================================

const express = require('express');
const router = express.Router();

// Middlewares
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize }    = require('../middlewares/rbac.middleware');
const { ROLES }        = require('../utils/constants');

// Controllers
const applicationController = require('../controllers/application.controller');

// -----------------------------------------------------------------
// 1. DRAFT ROUTES (Autosave functionality)
// Both endpoints require the user to be authenticated.
// -----------------------------------------------------------------
router.get(
  '/drafts',
  authenticate,
  applicationController.getDraft
);

router.post(
  '/drafts',
  authenticate,
  applicationController.saveDraft
);

router.delete(
  '/drafts',
  authenticate,
  applicationController.deleteDraft
);

// -----------------------------------------------------------------
// 2. SUBMISSION ROUTE
// Strict RBAC: Only users with the 'Applicant' role can submit a UAF.
// -----------------------------------------------------------------
router.post(
  '/uaf',
  authenticate,
  authorize(ROLES.APPLICANT),
  applicationController.submitUAF
);

// -----------------------------------------------------------------
// 3. UTILITY ROUTES (Uploads & Status Polling)
// -----------------------------------------------------------------
router.get(
  '/lookups',
  authenticate,
  applicationController.getUafLookups
);

router.get(
  '/barangays',
  authenticate,
  applicationController.getActiveBarangays
);

router.get(
  '/requirements',
  authenticate,
  applicationController.getApplicableRequirements
);

router.post(
  '/upload',
  authenticate,
  applicationController.requestUploadUrl
);

router.get(
  '/list',
  authenticate,
  applicationController.getApplicationsList
);

router.get(
  '/:app_no/assessment',
  authenticate,
  applicationController.getAssessmentForApplicant
);

router.get(
  '/:app_no/status',
  authenticate,
  applicationController.getStatus
);

router.get(
  '/:app_no/edit',
  authenticate,
  applicationController.getApplicationForEdit
);

module.exports = router;