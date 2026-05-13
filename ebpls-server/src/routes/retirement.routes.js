// =================================================================
// File: src/routes/retirement.routes.js
// Purpose: Business Retirement Module route definitions.
// Policy:  RBAC enforced per-handler (mixed roles access this module).
// =================================================================

const express = require('express');
const {
  submitRetirement,
  getMyRetirements,
  getMyBusinesses,
  getRetirementQueue,
  acknowledgeRetirement,
  assessRetirement,
  recordRetirementPayment,
  completeRetirement,
  getRetirementDetail,
} = require('../controllers/retirement.controller');

const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// -----------------------------------------------------------------
// APPLICANT ROUTES
// -----------------------------------------------------------------

// Submit a retirement application
router.post(
  '/submit',
  authorize(ROLES.APPLICANT),
  submitRetirement
);

// View my retirement applications
router.get(
  '/my',
  authorize(ROLES.APPLICANT),
  getMyRetirements
);

// Get my active businesses (for retirement form dropdown)
router.get(
  '/my-businesses',
  authorize(ROLES.APPLICANT),
  getMyBusinesses
);

// -----------------------------------------------------------------
// BPLO OFFICER ROUTES
// -----------------------------------------------------------------

// View retirement queue (pending applications)
router.get(
  '/queue',
  authorize(ROLES.BPLO_OFFICER, ROLES.TREASURY_OFFICER, ROLES.ADMIN),
  getRetirementQueue
);

// Acknowledge and forward to Treasury
router.put(
  '/:id/acknowledge',
  authorize(ROLES.BPLO_OFFICER, ROLES.ADMIN),
  acknowledgeRetirement
);

// Complete retirement (after payment)
router.put(
  '/:id/complete',
  authorize(ROLES.BPLO_OFFICER, ROLES.TREASURY_OFFICER, ROLES.ADMIN),
  completeRetirement
);

// -----------------------------------------------------------------
// TREASURY OFFICER ROUTES
// -----------------------------------------------------------------

// Assess final taxes for retirement
router.put(
  '/:id/assess',
  authorize(ROLES.TREASURY_OFFICER, ROLES.ADMIN),
  assessRetirement
);

// Record OTC payment for retirement
router.put(
  '/:id/record-payment',
  authorize(ROLES.TREASURY_OFFICER, ROLES.ADMIN),
  recordRetirementPayment
);

// -----------------------------------------------------------------
// SHARED ROUTES
// -----------------------------------------------------------------

// Get retirement detail (any authenticated officer or the applicant)
router.get(
  '/:id',
  authorize(ROLES.APPLICANT, ROLES.BPLO_OFFICER, ROLES.TREASURY_OFFICER, ROLES.ADMIN),
  getRetirementDetail
);

module.exports = router;
