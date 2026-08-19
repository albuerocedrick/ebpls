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
const { dispatchEmail, EMAIL_TRIGGERS } = require('../services/email.service');
const pdfService = require('../services/pdf.service');

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

    // 1. Transition: Assessed -> For Payment
    await applicationService.updateApplicationStatus(app_no, STATUSES.FOR_PAYMENT, req.user.userId);

    // 2. Audit
    await logAction({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.APPLICATION_STATUS_UPDATED,
      entityType: 'applications',
      entityId: app_no,
      newValue: { status: STATUSES.FOR_PAYMENT, note: 'Assessment finalized and posted to billing.' }
    });

    // Return response immediately — TOP email generation is fire-and-forget below.
    res.status(200).json({
      success: true,
      message: 'Assessment finalized. Applicant can now view and pay.'
    });

    // Phase 9: Send TOP_GENERATED email with PDF attached.
    // Generate the TOP PDF in-memory here so the email is sent exactly once
    // (not every time the applicant clicks the Download button).
    const { data: topData } = await supabaseAdmin
      .from('applications')
      .select(`
        businesses (
          business_name,
          taxpayers ( first_name, middle_name, last_name, users ( email, user_id ) )
        )
      `)
      .eq('application_no', app_no)
      .single();

    const { data: topAssessment } = await supabaseAdmin
      .from('assessments')
      .select('id, total_amount, created_at, assessment_line_items ( fee_type_id, amount, fee_types ( name ) )')
      .eq('application_no', app_no)
      .single();

    const topTaxpayer = topData?.businesses?.taxpayers;
    const topUser     = topTaxpayer?.users;

    if (topTaxpayer && topUser?.email && topAssessment) {
      const ownerName  = `${topTaxpayer.first_name}${topTaxpayer.middle_name ? ' ' + topTaxpayer.middle_name : ''} ${topTaxpayer.last_name}`;
      const lineItems  = topAssessment.assessment_line_items?.map((item) => ({
        name:   item.fee_types?.name || `Fee #${item.fee_type_id}`,
        amount: item.amount,
      })) || [];

      const topBuffer = await pdfService.generateTOPPDF({
        applicationNo: app_no,
        businessName:  topData.businesses?.business_name || 'Business',
        ownerName,
        assessedAt:    topAssessment.created_at,
        lineItems,
        totalAmount:   topAssessment.total_amount,
      });

      dispatchEmail({
        triggerEvent:   EMAIL_TRIGGERS.TOP_GENERATED,
        recipientEmail: topUser.email,
        applicationNo:  app_no,
        payload: {
          name:         `${topTaxpayer.first_name} ${topTaxpayer.last_name}`,
          applicationNo: app_no,
          businessName: topData.businesses?.business_name || 'your business',
          totalAmount:  topAssessment.total_amount,
        },
        attachments: [{
          filename: `TOP_${app_no}.pdf`,
          buffer:   topBuffer,
        }],
      });

      // Phase 6: Insert in-app notification
      if (topUser.user_id) {
        supabaseAdmin.from('notifications').insert({
          user_id:        topUser.user_id,
          application_no: app_no,
          type:           'APPLICATION_ASSESSED',
          title:          'Fees Assessed',
          message:        'Your fees have been assessed. Please proceed to payment.',
          action_url:     `/applicant/status?id=${app_no}`,
        }).then(({ error }) => {
          if (error) console.error('[treasury.controller] Failed to insert assessed notification:', error.message);
        });
      }
    }

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
    const { application_no, amount_tendered, tendered_type, check_number, bank_name } = req.body;

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

    // Auto-generate OR number
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const { count, error: countErr } = await supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .like('or_number', `OTC-${today}-%`);
    
    if (countErr) {
      console.warn('[treasury.controller] Failed to get transaction count for OR generation. Fallback to UUID.');
    }
    const sequence = String((count || 0) + 1).padStart(6, '0');
    const or_number = countErr 
      ? `OTC-${today}-${require('crypto').randomUUID().slice(0, 6)}` 
      : `OTC-${today}-${sequence}`;

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

    // Return response immediately — email is fire-and-forget below.
    res.status(200).json({
      success: true,
      data: transaction
    });

    // Phase 9: Wire PAYMENT_RECORDED email for OTC.
    // Resolve the applicant via the application → businesses → taxpayers → users join.
    const { data: appInfo } = await supabaseAdmin
      .from('applications')
      .select(`
        businesses (
          business_name,
          taxpayers (
            first_name, last_name,
            users ( email, user_id )
          )
        )
      `)
      .eq('application_no', application_no)
      .single();

    const taxpayer = appInfo?.businesses?.taxpayers;
    const userInfo = taxpayer?.users;

    if (taxpayer && userInfo?.email) {
      dispatchEmail({
        triggerEvent:   EMAIL_TRIGGERS.PAYMENT_RECORDED,
        recipientEmail: userInfo.email,
        applicationNo:  application_no,
        payload: {
          name:           `${taxpayer.first_name} ${taxpayer.last_name}`,
          applicationNo:  application_no,
          businessName:   appInfo.businesses?.business_name || 'your business',
          orNumber:       or_number,
          amount:         assessment.total_amount,
          paymentChannel: `Over-the-Counter (${tendered_type})`,
        },
      });

      // Phase 9: PERMIT_READY email — fires once here (not on every download click).
      // Since OTC auto-completes the application (Paid → Completed), the permit
      // is instantly available. Notify the applicant to log in and download it.
      dispatchEmail({
        triggerEvent:   EMAIL_TRIGGERS.PERMIT_READY,
        recipientEmail: userInfo.email,
        applicationNo:  application_no,
        payload: {
          name:         `${taxpayer.first_name} ${taxpayer.last_name}`,
          applicationNo: application_no,
          businessName: appInfo.businesses?.business_name || 'your business',
        },
      });

      // Phase 6: Insert in-app notification
      if (userInfo.user_id) {
        supabaseAdmin.from('notifications').insert({
          user_id:        userInfo.user_id,
          application_no: application_no,
          type:           'PAYMENT_CONFIRMED',
          title:          'Payment Confirmed',
          message:        'Your OTC payment has been confirmed. Your permit is ready for download.',
          action_url:     `/applicant/status?id=${application_no}`,
        }).then(({ error }) => {
          if (error) console.error('[treasury.controller] Failed to insert payment confirmed notification:', error.message);
        });
      }
    }
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
      newValue: { payment_intent_id: pmSession.paymentIntentId, amount: totalAmount }
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

/**
 * GET /api/treasury/fee-schedule
 * Fetch the full Revenue Code fee schedule
 */
const getFeeSchedule = async (req, res, next) => {
  try {
    // 1. Fetch categories
    const { data: categories, error: catErr } = await supabaseAdmin
      .from('fee_schedule_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (catErr) throw createError('Failed to fetch fee categories.', 500, ERROR_CODES.INTERNAL_ERROR);

    // 2. Fetch items
    const { data: items, error: itemErr } = await supabaseAdmin
      .from('fee_schedule_items')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (itemErr) throw createError('Failed to fetch fee items.', 500, ERROR_CODES.INTERNAL_ERROR);

    // 3. Fetch rules
    const { data: rules, error: rulesErr } = await supabaseAdmin
      .from('fee_schedule_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesErr) throw createError('Failed to fetch fee rules.', 500, ERROR_CODES.INTERNAL_ERROR);

    // 4. Map items to categories
    const categoriesWithItems = categories.map(cat => ({
      ...cat,
      items: items.filter(item => item.category_id === cat.id)
    }));

    return res.status(200).json({
      success: true,
      data: {
        categories: categoriesWithItems,
        rules: rules
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/treasury/fee-schedule/lookup
 * Lookup fee schedule item by business activity and optional tier
 */
const lookupFeeSchedule = async (req, res, next) => {
  try {
    const { activity_name, tier_count } = req.query;

    if (!activity_name) {
      throw createError('activity_name query parameter is required', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const count = tier_count ? parseInt(tier_count, 10) : null;

    // Step 1: Exact match query on activity_match (case-insensitive)
    let { data: items, error: exactErr } = await supabaseAdmin
      .from('fee_schedule_items')
      .select('*')
      .ilike('activity_match', activity_name)
      .eq('is_active', true);

    if (exactErr) throw createError('Database error during lookup.', 500, ERROR_CODES.INTERNAL_ERROR);

    // Step 2: Partial ILIKE match
    if (!items || items.length === 0) {
      const { data: partialItems, error: partialErr } = await supabaseAdmin
        .from('fee_schedule_items')
        .select('*')
        .ilike('activity_match', `%${activity_name}%`)
        .eq('is_active', true);

      if (partialErr) throw createError('Database error during lookup.', 500, ERROR_CODES.INTERNAL_ERROR);
      items = partialItems || [];
    }

    // Step 3: No match at all -> Return DEFAULT_FEE
    if (!items || items.length === 0) {
      // Get default fee rule
      const { data: defaultRule } = await supabaseAdmin
        .from('fee_schedule_rules')
        .select('value')
        .eq('rule_code', 'DEFAULT_FEE')
        .single();
        
      return res.status(200).json({
        success: true,
        data: {
          amount: defaultRule ? parseFloat(defaultRule.value) : 500.00,
          is_default: true
        }
      });
    }

    // Filter by tier if applicable
    let matchedItem = items[0];
    
    // If there are multiple matches, check if they are tiered
    if (items.length > 1 || items[0].tier_label !== null) {
      // We need to apply tier filtering
      if (count !== null) {
        matchedItem = items.find(item => {
          const minMatch = item.tier_min === null || count >= item.tier_min;
          const maxMatch = item.tier_max === null || count <= item.tier_max;
          return minMatch && maxMatch;
        }) || items[0]; // fallback to first if count doesn't match
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        ...matchedItem,
        is_default: false
      }
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
  getTreasuryQueue,
  getFeeSchedule,
  lookupFeeSchedule
};