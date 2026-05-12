const express = require('express');
const { 
    getPendingClearances, 
    issueClearance, 
    rejectClearance 
} = require('../controllers/barangay.controller');

// CORRECTED IMPORTS: Using the exact names from your middleware files
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// CORRECTED: Apply authentication to all routes
router.use(authenticate);

// CORRECTED: Strictly lock all routes to Barangay Officer (Removed the array brackets!)
router.use(authorize(ROLES.BARANGAY_OFFICER));

// GET /api/barangay/clearances/pending
router.get('/clearances/pending', getPendingClearances);

// PUT /api/barangay/clearances/:id/issue
router.put('/clearances/:id/issue', issueClearance);

// PUT /api/barangay/clearances/:id/reject
router.put('/clearances/:id/reject', rejectClearance);

module.exports = router;