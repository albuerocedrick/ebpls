// =================================================================
// File: src/controllers/webhook.controller.js
// Purpose: Secure handler for PayMongo webhooks (async payment confirmation).
// Policy:  Always return 200 to PayMongo to stop retries.
//          Verify signature BEFORE any processing.
//          Maintain idempotency via payment_gateway_logs.
// =================================================================

const { supabaseAdmin } = require('../config/supabase');
const paymongo = require('../services/paymongo.service');
const applicationService = require('../services/application.service');
const auditService = require('../services/audit.service');
const { AUDIT_ACTIONS, STATUSES } = require('../utils/constants');

/**
 * Main Webhook Receiver
 * Note: req.body must be the RAW Buffer (handled via express.raw in app.js)
 */
const handlePaymongo = async (req, res) => {
  const signature = req.headers['paymongo-signature'];
  
  // 1. Signature Verification
  const isValid = paymongo.verifyWebhookSignature(req.body, signature);
  if (!isValid) {
    console.error(`[Webhook] Signature verification failed for ${req.ip}`);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    // 2. Parse the verified payload
    const payload = JSON.parse(req.body.toString('utf8'));
    const event = payload.data;
    const eventId = event.id;
    const attributes = event.attributes;
    const eventType = attributes.type; 
    const resourceData = attributes.data; // This is the payment or payment_intent object

    // 3. Idempotency Check
    const { data: existingLog } = await supabaseAdmin
      .from('payment_gateway_logs')
      .select('log_id, processed')
      .eq('paymongo_event_id', eventId)
      .single();

    if (existingLog && existingLog.processed) {
      console.log(`[Webhook] Event ${eventId} already processed. Skipping.`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    // 4. Initial Log Entry (mark as unprocessed)
    const applicationNo = resourceData?.attributes?.metadata?.application_no || null;
    
    const { data: logEntry, error: logErr } = await supabaseAdmin
      .from('payment_gateway_logs')
      .upsert({
        paymongo_event_id: eventId,
        gateway: 'paymongo',
        event_type: eventType,
        application_no: applicationNo,
        raw_payload: payload,
        processed: false
      }, { onConflict: 'paymongo_event_id' })
      .select()
      .single();

    if (logErr) throw new Error(`Log insertion failed: ${logErr.message}`);

    console.log(`[Webhook] Received Event: ${eventType} for Application: ${applicationNo}`);

    // 5. Handle Event Types
    if (eventType === 'payment.paid' || 
        eventType === 'payment_intent.payment_paid' || 
        eventType === 'checkout_session.payment_success') {
      await processSuccessfulPayment(resourceData, attributes, applicationNo, logEntry.log_id, req.ip);
    } 
    else if (
      eventType === 'payment.failed' || 
      eventType === 'payment_intent.payment_failed' ||
      eventType === 'source.failed' ||
      eventType === 'source.expired' ||
      eventType === 'checkout_session.expired'
    ) {
      await processFailedPayment(resourceData, attributes, applicationNo, logEntry.log_id, req.ip);
    }

    // 6. Always return 200 to acknowledge receipt
    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('[Webhook Error]', err.message);
    // Return 200 even on error to stop PayMongo from retrying a broken internal process
    return res.status(200).json({ received: true, error: err.message });
  }
};

/**
 * Logic for successful payment (Paid)
 */
async function processSuccessfulPayment(paymentData, eventAttributes, metaAppNo, logId, ip) {
  // Extract Payment Intent ID (depends on event structure: payment vs checkout_session)
  const piId = paymentData?.attributes?.payment_intent_id || 
               paymentData?.attributes?.payment_intent?.id ||
               eventAttributes?.payment_intent_id;
  
  // Find the transaction record
  const { data: transaction, error: txError } = await supabaseAdmin
    .from('transactions')
    .select('*, assessments(application_no)')
    .eq('paymongo_payment_intent_id', piId)
    .single();

  if (txError || !transaction) {
    console.warn(`[Webhook] No transaction found for PI: ${piId}`, txError?.message);
    return;
  }

  const assData = Array.isArray(transaction.assessments) ? transaction.assessments[0] : transaction.assessments;
  const appNo = assData?.application_no || metaAppNo;

  const paymentChannel = paymentData?.attributes?.source?.type || 'online';
  const paymongoPaymentId = paymentData.id; // pay_xxx

  // Generate Online OR Number: PM-{YYYYMMDD}-{seq}
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const { count } = await supabaseAdmin
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .like('or_number', `PM-${today}-%`);
  
  const seq = String((count || 0) + 1).padStart(6, '0');
  const orNumber = `PM-${today}-${seq}`;

  // Update Transaction
  await supabaseAdmin
    .from('transactions')
    .update({
      or_number: orNumber,
      paymongo_payment_id: paymongoPaymentId,
      payment_channel: paymentChannel,
      amount_tendered: paymentData.attributes.amount / 100,
      paid_at: new Date().toISOString()
    })
    .eq('transaction_id', transaction.transaction_id);

  // Transition: PaymentProcessing -> Paid
  await applicationService.updateApplicationStatus(appNo, STATUSES.PAID, null);

  // Audit
  await auditService.logAction({
    userId: null, // System action
    action: AUDIT_ACTIONS.ONLINE_PAYMENT_CONFIRMED,
    entityType: 'transactions',
    entityId: transaction.transaction_id,
    newValue: { or_number: orNumber, paymongo_payment_id: paymongoPaymentId },
    ipAddress: ip
  });

  // Mark Log as Processed
  await supabaseAdmin
    .from('payment_gateway_logs')
    .update({ 
      processed: true, 
      processed_at: new Date().toISOString(),
      transaction_id: transaction.transaction_id 
    })
    .eq('log_id', logId);

  // Note: Phase 8 & 9 will trigger PDF generation and Email here.
}

/**
 * Logic for failed payment (Retry allowed)
 */
async function processFailedPayment(paymentData, eventAttributes, metaAppNo, logId, ip) {
  const piId = paymentData?.attributes?.payment_intent_id || eventAttributes?.payment_intent_id;
  let appNo = metaAppNo;

  // 1. Try to find transaction/app via PI ID if available
  if (piId) {
    const { data: transaction } = await supabaseAdmin
      .from('transactions')
      .select('*, assessments(application_no)')
      .eq('paymongo_payment_intent_id', piId)
      .single();

    if (transaction) {
      const assData = Array.isArray(transaction.assessments) ? transaction.assessments[0] : transaction.assessments;
      appNo = assData?.application_no || appNo;
    }
  }

  // 2. Revert Status if we have an application number
  if (appNo) {
    console.log(`[Webhook] Reverting status for ${appNo} due to payment failure/expiration.`);
    
    // Revert: PaymentProcessing -> For Payment (allows user to try again)
    await applicationService.updateApplicationStatus(appNo, STATUSES.FOR_PAYMENT, null);

    await auditService.logAction({
      userId: null,
      action: AUDIT_ACTIONS.ONLINE_PAYMENT_FAILED,
      entityType: 'applications',
      entityId: appNo,
      ipAddress: ip
    });
  } else {
    console.warn(`[Webhook] Could not identify application for failed/expired payment. PI: ${piId}`);
  }

  // 3. Mark Log as Processed
  await supabaseAdmin
    .from('payment_gateway_logs')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq('log_id', logId);
}

module.exports = {
  handlePaymongo
};