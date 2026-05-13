// =================================================================
// File: src/routes/treasury.routes.js
// Purpose: Internal treasury operations (Assessment & OTC Payments).
// Policy:  Restricted to Treasury Officers and Admins.
// =================================================================

const express = require('express');
const treasuryController = require('../controllers/treasury.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// All standard treasury routes require Treasury_Officer or Admin role
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
 * @route   GET /api/treasury/queue
 * @desc    Get applications ready for assessment or payment
 */
router.get('/queue', treasuryController.getTreasuryQueue);

/**
 * @route   POST /api/treasury/payments/otc
 * @desc    Record a physical Cash/Manager Check payment
 */
router.post('/payments/otc', treasuryController.recordOTCPayment);

module.exports = router;