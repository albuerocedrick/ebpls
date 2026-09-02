const express = require('express');
const router = express.Router();

const correctionController = require('../controllers/correction.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../utils/constants');

// Applicant Endpoints
router.post(
  '/', 
  authenticate, 
  authorize(ROLES.APPLICANT), 
  correctionController.submitCorrectionRequest
);

router.post(
  '/upload', 
  authenticate, 
  authorize(ROLES.APPLICANT), 
  correctionController.getUploadUrl
);

router.get(
  '/my', 
  authenticate, 
  authorize(ROLES.APPLICANT), 
  correctionController.listMyCorrectionRequests
);

module.exports = router;
