// =================================================================
// File: src/routes/treasury.routes.js
// Purpose: Internal treasury operations (Assessment, OTC, and Proof of Payments).
// Policy:  Restricted to Treasury Officers, Admins, and Applicants (for own proofs).
// =================================================================

const express = require('express');
const treasuryController = require('../controllers/treasury.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

/**
 * @route   GET /api/treasury/fee-schedule
 * @desc    Fetch the full categorized Revenue Code fee schedule (Read-only for all logged in users)
 */
router.get('/fee-schedule', authenticate, treasuryController.getFeeSchedule);

/**
 * @route   GET /api/treasury/fee-schedule/lookup
 * @desc    Lookup fee item by business activity and optional tier count (Read-only for all logged in users)
 */
router.get('/fee-schedule/lookup', authenticate, treasuryController.lookupFeeSchedule);

/**
 * Proof of Payment Routes (Phase 5)
 * Accessible by Applicant (for own application), Treasury Officer, and Admin
 */
router.post(
  '/payments/proof-upload-url',
  authenticate,
  authorize(ROLES.APPLICANT, ROLES.TREASURY_OFFICER, ROLES.ADMIN),
  treasuryController.getProofUploadUrl
);

router.post(
  '/payments/proof',
  authenticate,
  authorize(ROLES.APPLICANT, ROLES.TREASURY_OFFICER, ROLES.ADMIN),
  treasuryController.submitPaymentProof
);

router.get(
  '/payments/:app_no/proof',
  authenticate,
  authorize(ROLES.APPLICANT, ROLES.TREASURY_OFFICER, ROLES.ADMIN),
  treasuryController.getPaymentProofUrl
);

// All subsequent treasury routes require Treasury_Officer or Admin role
router.use(authenticate, authorize(ROLES.TREASURY_OFFICER, ROLES.ADMIN));

/**
 * @route   POST /api/treasury/assess
 * @desc    Generate initial assessment for a verified application
 */
router.post('/assess', treasuryController.assessApplication);

/**
 * @route   GET /api/treasury/assess/:app_no
 * @desc    Get assessment and line items for an application
 */
router.get('/assess/:app_no', treasuryController.getAssessmentByApp);
router.put('/assess/:app_no/bmbe', treasuryController.updateBmbeExemption);
router.post('/assess/:app_no/bmbe-certificate', treasuryController.uploadBmbeCertificate);
router.get('/assess/:app_no/bmbe-certificate', treasuryController.getBmbeCertificate);

/**
 * @route   PUT /api/treasury/assess/:app_no/finalize
 * @desc    Finalize assessment and move to For Payment
 */
router.put('/assess/:app_no/finalize', treasuryController.finalizeAssessment);

/**
 * @route   PUT /api/treasury/assess/:id/override
 * @desc    Override a specific fee line item
 */
router.put('/assess/:id/override', treasuryController.overrideFeeItem);

/**
 * @route   PUT /api/treasury/assess/:id/reset
 * @desc    Reset an overridden fee line item back to default calculated price
 */
router.put('/assess/:id/reset', treasuryController.resetFeeItem);

/**
 * @route   GET /api/treasury/queue
 * @desc    Get applications ready for assessment or payment
 */
router.get('/queue', treasuryController.getTreasuryQueue);

/**
 * @route   POST /api/treasury/payments/otc
 * @desc    Record a physical Cash/Manager Check payment
 */
router.post('/payments/otc', treasuryController.recordOTCPayment);

/**
 * @route   GET /api/treasury/payments/pending-proofs
 * @desc    Fetch pending deposit slips awaiting cashier verification
 */
router.get('/payments/pending-proofs', treasuryController.getPendingPaymentProofs);

/**
 * @route   PUT /api/treasury/payments/:id/verify-proof
 * @desc    Confirm and verify, or reject a submitted payment proof
 */
router.put('/payments/:id/verify-proof', treasuryController.verifyPaymentProof);

module.exports = router;
