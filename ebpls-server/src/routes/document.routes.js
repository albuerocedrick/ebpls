// =================================================================
// File: src/routes/document.routes.js
// Purpose: PDF document generation endpoints — Phase 8.
// Policy:  All routes require authentication. Ownership checks are
//          handled inside each controller handler.
// =================================================================

const express = require('express');
const {
  getPermitPDF,
  getEResiboPDF,
  getTOPPDF,
  getBarangayClearancePDF,
} = require('../controllers/document.controller');

const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Business Permit PDF
// Accessible by: Applicant (owner), BPLO, Admin
router.get(
  '/permit/:app_no',
  authorize(ROLES.APPLICANT, ROLES.BPLO_OFFICER, ROLES.ADMIN),
  getPermitPDF
);

// E-Resibo (Official Receipt) PDF
// Accessible by: Applicant (owner), Treasury, Admin
router.get(
  '/eresibo/:app_no',
  authorize(ROLES.APPLICANT, ROLES.TREASURY_OFFICER, ROLES.ADMIN),
  getEResiboPDF
);

// Tax Order of Payment (TOP) PDF
// Accessible by: Applicant (owner), Treasury, Admin
router.get(
  '/top/:app_no',
  authorize(ROLES.APPLICANT, ROLES.TREASURY_OFFICER, ROLES.ADMIN),
  getTOPPDF
);

// Barangay Clearance PDF
// Accessible by: Applicant (owner), Barangay, BPLO, Admin
router.get(
  '/barangay-clearance/:id',
  authorize(ROLES.APPLICANT, ROLES.BARANGAY_OFFICER, ROLES.BPLO_OFFICER, ROLES.ADMIN),
  getBarangayClearancePDF
);

module.exports = router;
