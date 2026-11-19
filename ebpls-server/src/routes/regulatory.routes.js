const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../utils/constants');
const controller = require('../controllers/regulatory.controller');

const router = express.Router();
router.use(authenticate, authorize(ROLES.ADMIN, ...Object.values(controller.agencyRoles)));
router.get('/queue', controller.getQueue);
router.get('/:applicationNo/documents', controller.getApplicationDocuments);
router.put('/:applicationNo/verify', controller.verify);
router.put('/:applicationNo/return', controller.returnClearance);
module.exports = router;
