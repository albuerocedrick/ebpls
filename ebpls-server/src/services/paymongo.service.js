// =================================================================
// File: src/services/paymongo.service.js
// Purpose: PayMongo API client for online payments and webhook verification.
// Policy:  Credentials must NEVER be logged. Amount must always be
//          converted to centavos (integer).
// =================================================================

const crypto = require('crypto');
const axios = require('axios');
const env = require('../config/env');

/**
 * Internal helper to generate the Basic Auth header required by PayMongo.
 * Format: Base64(secret_key + ':')
 */
const getAuthHeader = () => {
  const encoded = Buffer.from(`${env.PAYMONGO_SECRET_KEY}:`).toString('base64');
  return `Basic ${encoded}`;
};

/**
 * Creates a Checkout Session in PayMongo.
 * Returns a hosted checkout_url for the applicant.
 * 
 * @param {number} amountInCentavos - Amount to charge (PHP * 100).
 * @param {string} description - Appears on the checkout page.
 * @param {string} applicationNo - Attached as metadata for tracking.
 */
const createCheckoutSession = async (amountInCentavos, description, applicationNo) => {
  try {
    const response = await axios.post(
      'https://api.paymongo.com/v1/checkout_sessions',
      {
        data: {
          attributes: {
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description: description,
            line_items: [
              {
                amount: Math.round(amountInCentavos),
                currency: 'PHP',
                description: 'Business Permit Fees',
                name: 'Assessment Total',
                quantity: 1
              }
            ],
            payment_method_types: ['card', 'gcash', 'paymaya', 'grab_pay'],
            success_url: `${env.PAYMONGO_SUCCESS_URL}?application_no=${applicationNo}`,
            cancel_url: `${env.PAYMONGO_CANCEL_URL}?application_no=${applicationNo}`,
            metadata: {
              application_no: applicationNo
            }
          }
        }
      },
      {
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json'
        }
      }
    );

    const { data } = response.data;
    
    return {
      sessionId: data.id,
      checkout_url: data.attributes.checkout_url,
      paymentIntentId: data.attributes.payment_intent.id
    };
  } catch (error) {
    const errorMsg = error.response?.data?.errors?.[0]?.detail || error.message;
    console.error(`[paymongo.service] Create Checkout Session failed:`, errorMsg);
    throw new Error(`PayMongo Error: ${errorMsg}`);
  }
};

/**
 * Verifies the authenticity of an inbound PayMongo Webhook.
 * Uses HMAC-SHA256 with the Webhook Secret.
 * 
 * @param {Buffer} rawBody - The raw, unparsed request body.
 * @param {string} signatureHeader - The value of 'paymongo-signature' header.
 * @returns {boolean}
 */
const verifyWebhookSignature = (rawBody, signatureHeader) => {
  try {
    if (!rawBody || !signatureHeader) return false;

    // PayMongo uses 'v1=' (standard), 'te=' (test mode), or 'li=' (live mode)
    const parts = signatureHeader.split(',');
    const sigPart = parts.find(p => p.startsWith('v1=') || p.startsWith('te=') || p.startsWith('li='));
    
    if (!sigPart) return false;
    const paymongoHash = sigPart.split('=')[1];

    // PayMongo signature is computed on: timestamp + "." + raw_body
    const timestampPart = parts.find(p => p.startsWith('t='));
    const timestamp = timestampPart ? timestampPart.split('=')[1] : '';
    
    const signedPayload = timestamp + '.' + rawBody.toString();

    const expectedHash = crypto
      .createHmac('sha256', env.PAYMONGO_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    // Use timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash),
      Buffer.from(paymongoHash)
    );
  } catch (err) {
    console.error('[paymongo.service] Webhook verification error:', err.message);
    return false;
  }
};

/**
 * Retrieves full details of a specific payment.
 */
const getPayment = async (paymentId) => {
  try {
    const response = await axios.get(
      `https://api.paymongo.com/v1/payments/${paymentId}`,
      {
        headers: { 'Authorization': getAuthHeader() }
      }
    );
    return response.data.data;
  } catch (error) {
    console.error(`[paymongo.service] Get Payment failed:`, error.message);
    throw error;
  }
};

module.exports = {
  createCheckoutSession,
  verifyWebhookSignature,
  getPayment
};