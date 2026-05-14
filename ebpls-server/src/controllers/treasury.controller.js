// =================================================================
// File: src/controllers/treasury.controller.js
// Purpose: Handles Assessment, Fee Overrides, OTC and Online Payments.
// Policy:  Strict RBAC enforcement and state machine validation.
// =================================================================

const assessmentService = require('../services/assessment.service');
const applicationService = require('../services/application.service');
const paymongoService = require('../services/paymongo.service');
const { logAction, AUDIT_ACTIONS } = require('../services/audit.service');
const { supabaseAdmin } = require('../config/supabase');
const { createError } = require('../middlewares/error.middleware');
const { ERROR_CODES, STATUSES } = require('../utils/constants');

/**
 * Generates the initial fee assessment for a verified application.
 */
const assessApplication = async (req, res, next) => {
  try {
    const { application_no } = req.body;

    if (!application_no) {
      throw createError('Application number is required.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    // 1. Verify application status
    const { data: app, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('status')
      .eq('application_no', application_no)
      .single();

    if (appErr || !app) throw createError('Application not found.', 404, ERROR_CODES.NOT_FOUND);

    const validStatuses = [STATUSES.VERIFIED, STATUSES.FOR_ASSESSMENT, STATUSES.ASSESSED];
    if (!validStatuses.includes(app.status)) {
      throw createError(`Application is in ${app.status} status and cannot be assessed.`, 409, ERROR_CODES.CONFLICT);
    }

    // 2. Calculate fees using the calculation engine
    const calculatedData = await assessmentService.calculateFees(application_no);

    // 3. Persist the assessment to DB
    const assessment = await assessmentService.createAssessment(
      application_no, 
      req.user.userId, 
      calculatedData
    );

    // 4. Transition State Machine
    // If it's still in Verified, move it to For Assessment first.
    if (app.status === STATUSES.VERIFIED) {
      await applicationService.updateApplicationStatus(application_no, STATUSES.FOR_ASSESSMENT, req.user.userId);
    }
    
    // Move to Assessed only. We wait for the officer to "Finalize" before moving to For Payment.
    await applicationService.updateApplicationStatus(application_no, STATUSES.ASSESSED, req.user.userId);

    // 5. Audit Log
    await logAction({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.FEE_ASSESSED,
      entityType: 'assessments',
      entityId: assessment.id,
      newValue: { total_amount: assessment.total_amount }
    });

    return res.status(200).json({
      success: true,
      message: 'Assessment generated. Please review and finalize to post to billing.',
      data: {
        assessment_id: assessment.id,
        total_amount: assessment.total_amount,
        line_items: calculatedData.lineItems
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Finalizes an assessment and moves it to the For Payment stage.
 * Once finalized, the applicant can see the billing and pay online.
 */
const finalizeAssessment = async (req, res, next) => {
  try {
    const { app_no } = req.params;

    // 1. Use the shared service to transition the state.
    // This helper handles fetching the app, validating the transition (Assessed -> For Payment),
    // and updating the DB in one atomic-like sequence.
    await applicationService.updateApplicationStatus(app_no, STATUSES.FOR_PAYMENT, req.user.userId);

    // 2. Audit
    await logAction({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.APPLICATION_STATUS_UPDATED,
      entityType: 'applications',
      entityId: app_no,
      newValue: { status: STATUSES.FOR_PAYMENT, note: 'Assessment finalized and posted to billing.' }
    });

    return res.status(200).json({
      success: true,
      message: 'Assessment finalized. Applicant can now view and pay.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Manually override a specific fee amount.
 */
const overrideFeeItem = async (req, res, next) => {
  try {
    const { id } = req.params; // line item ID
    const { new_amount, reason } = req.body;

    if (new_amount === undefined || new_amount < 0 || !reason) {
      throw createError('Valid amount and override reason are required.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const updatedAssessment = await assessmentService.overrideLineItem(
      id, 
      new_amount, 
      reason, 
      req.user.userId
    );

    return res.status(200).json({
      success: true,
      message: 'Fee item overridden.',
      data: updatedAssessment
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch assessment and line items for a specific application.
 */
const getAssessmentByApp = async (req, res, next) => {
  try {
    const { app_no } = req.params;

    const { data: assessment, error: assError } = await supabaseAdmin
      .from('assessments')
      .select(`
        *,
        applications (status),
        assessment_line_items (
          id,
          fee_type_id,
          amount,
          is_override,
          override_reason,
          fee_types (name)
        )
      `)
      .eq('application_no', app_no)
      .single();

    if (assError || !assessment) {
      return res.status(200).json({
        success: true,
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      data: assessment
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Record a physical payment (Cash or Manager Check) at the Treasury window.
 */
const recordOTCPayment = async (req, res, next) => {
  try {
    const { application_no, or_number, amount_tendered, tendered_type, check_number, bank_name } = req.body;

    // 1. Basic Validation
    if (!['Cash', 'Manager Check'].includes(tendered_type)) {
      throw createError('OTC only accepts Cash or Manager Check.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    if (tendered_type === 'Manager Check' && (!check_number || !bank_name)) {
      throw createError('Check number and Bank name are required for Manager Check.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    // 2. Fetch Assessment
    const { data: assessment, error: assErr } = await supabaseAdmin
      .from('assessments')
      .select('id, total_amount, status:applications(status)')
      .eq('application_no', application_no)
      .single();

    if (assErr || !assessment) throw createError('Assessment not found.', 404, ERROR_CODES.NOT_FOUND);

    if (assessment.status?.status === STATUSES.PAYMENT_PROCESSING) {
      throw createError('An online payment is currently in progress for this application.', 409, ERROR_CODES.CONFLICT);
    }

    if (Number(amount_tendered) < Number(assessment.total_amount)) {
      throw createError('Tendered amount is less than the total amount due.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const changeAmount = Number(amount_tendered) - Number(assessment.total_amount);

    // 3. Insert Transaction
    const { data: transaction, error: transErr } = await supabaseAdmin
      .from('transactions')
      .insert({
        assessment_id: assessment.id,
        or_number,
        amount_due: assessment.total_amount,
        amount_tendered,
        change_amount: changeAmount,
        tendered_type,
        check_number,
        bank_name,
        cashier_id: req.user.userId,
        paid_at: new Date().toISOString()
      })
      .select()
      .single();

    if (transErr) {
      if (transErr.code === '23505') throw createError('OR Number already exists.', 409, ERROR_CODES.CONFLICT);
      throw createError('Failed to record transaction.', 500, ERROR_CODES.INTERNAL_ERROR);
    }

    // 4. State Transition: For Payment -> Paid -> Completed
    await applicationService.updateApplicationStatus(application_no, STATUSES.PAID, req.user.userId);
    // Auto-complete: Paid -> Completed (permit is issued upon payment)
    await applicationService.updateApplicationStatus(application_no, STATUSES.COMPLETED, req.user.userId);
    
    // 5. Audit
    await logAction({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.OTC_PAYMENT_RECORDED,
      entityType: 'transactions',
      entityId: transaction.transaction_id,
      newValue: { or_number, amount_tendered }
    });

    return res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Generates a PayMongo Payment Intent for the applicant.
 */
const initiateOnlinePayment = async (req, res, next) => {
  try {
    const { application_no } = req.body;

    // 1. Ownership & Status Check
    const { data: app, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('status, business_id, assessments(id, total_amount), businesses(taxpayer_id)')
      .eq('application_no', application_no)
      .single();

    if (appErr || !app) throw createError('Application not found.', 404, ERROR_CODES.NOT_FOUND);

    // Security: If applicant, must own the business
    if (req.user.roleName === 'Applicant' && app.businesses.taxpayer_id !== req.user.taxpayerId) {
      throw createError('Access denied.', 403, ERROR_CODES.FORBIDDEN);
    }

    const payableStatuses = [STATUSES.FOR_PAYMENT, STATUSES.PAYMENT_PROCESSING];
    if (!payableStatuses.includes(app.status)) {
      throw createError(`Application is in ${app.status} status and is not in a payable state.`, 409, ERROR_CODES.CONFLICT);
    }

    const totalAmountRaw = Array.isArray(app.assessments) 
      ? app.assessments[0]?.total_amount 
      : app.assessments?.total_amount;

    const totalAmount = Number(totalAmountRaw || 0);

    if (totalAmount <= 0) {
      console.error(`[treasury.controller] Invalid assessment for ${application_no}:`, app.assessments);
      throw createError(`Invalid assessment amount (₱${totalAmount}). Please contact Treasury.`, 400, ERROR_CODES.VALIDATION_ERROR);
    }

    // 2. Create Checkout Session via PayMongo
    const description = `Business Permit Application ${application_no} - Municipality of Liliw`;
    const amountInCentavos = Math.round(totalAmount * 100);
    
    const pmSession = await paymongoService.createCheckoutSession(
      amountInCentavos,
      description,
      application_no
    );

    const assessmentId = Array.isArray(app.assessments)
      ? app.assessments[0]?.id
      : app.assessments?.id;

    const { error: txErr } = await supabaseAdmin
      .from('transactions')
      .upsert({
        assessment_id: assessmentId,
        amount_due: totalAmount,
        amount_tendered: totalAmount,
        tendered_type: 'Online',
        paymongo_payment_intent_id: pmSession.paymentIntentId,
        paid_at: null // Not yet paid
      }, { onConflict: 'assessment_id' });

    if (txErr) throw new Error(`Failed to save transaction: ${txErr.message}`);

    // 4. State Transition: For Payment -> PaymentProcessing
    // Only transition if not already in PaymentProcessing (idempotent)
    if (app.status !== STATUSES.PAYMENT_PROCESSING) {
      await applicationService.updateApplicationStatus(application_no, STATUSES.PAYMENT_PROCESSING, req.user.userId);
    }

    // 5. Audit
    await logAction({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.ONLINE_PAYMENT_INITIATED,
      entityType: 'applications',
      entityId: application_no,
      newValue: { payment_intent_id: pmSession.paymentIntentId }
    });

    return res.status(200).json({
      success: true,
      data: pmSession
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch applications that are in statuses relevant to Treasury (Verified, For Assessment, Assessed, For Payment).
 */
const getTreasuryQueue = async (req, res, next) => {
  try {
    const { data: applications, error } = await supabaseAdmin
      .from('applications')
      .select(`
        application_no,
        status,
        submitted_at,
        businesses (
          business_name
        )
      `)
      .in('status', [
        STATUSES.VERIFIED, 
        STATUSES.FOR_ASSESSMENT, 
        STATUSES.ASSESSED, 
        STATUSES.FOR_PAYMENT,
        STATUSES.PAYMENT_PROCESSING
      ])
      .order('submitted_at', { ascending: false });

    if (error) {
      throw createError('Failed to fetch treasury queue.', 500, ERROR_CODES.INTERNAL_ERROR);
    }

    return res.status(200).json({
      success: true,
      data: applications
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  assessApplication,
  finalizeAssessment,
  overrideFeeItem,
  getAssessmentByApp,
  recordOTCPayment,
  initiateOnlinePayment,
  getTreasuryQueue
};