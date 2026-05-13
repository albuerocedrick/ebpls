// =================================================================
// File: src/routes/treasury.online.routes.js
// Purpose: Online payment initiation.
// Policy:  Accessible by Applicants (own apps) and Treasury Officers.
// =================================================================

const express = require('express');
const treasuryController = require('../controllers/treasury.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

/**
 * @route   POST /api/treasury/payments/online
 * @desc    Initiate PayMongo checkout and get checkout_url
 * @access  Applicant (Owner) or Treasury Officer
 */
router.post(
  '/payments/online',
  authenticate,
  authorize(ROLES.APPLICANT, ROLES.TREASURY_OFFICER, ROLES.ADMIN),
  treasuryController.initiateOnlinePayment
);

module.exports = router;