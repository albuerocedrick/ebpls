// =================================================================
// File: src/routes/webhook.routes.js
// Purpose: Public endpoints for third-party webhook callbacks.
// Policy:  Must NOT use authenticate or authorize (they are called by PayMongo).
//          Security is handled via signature verification inside the controller.
// =================================================================

const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

/**
 * POST /api/webhooks/paymongo
 * PayMongo sends asynchronous payment notifications here.
 */
router.post('/paymongo', webhookController.handlePaymongo);

module.exports = router;