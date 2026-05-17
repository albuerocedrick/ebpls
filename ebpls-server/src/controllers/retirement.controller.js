// =================================================================
// File: src/controllers/retirement.controller.js
// Purpose: Business Retirement / Cessation Module handlers.
// Policy:  Retirement has its own state machine (retirement_status enum):
//          Pending → Assessed → Paid → Completed.
//          Payment reuses the existing OTC flow (POST /api/treasury/payments/otc).
//          Completion flips businesses.is_retired = TRUE.
// =================================================================

const { supabaseAdmin } = require('../config/supabase');
const { logAction, AUDIT_ACTIONS } = require('../services/audit.service');
const { dispatchEmail, EMAIL_TRIGGERS } = require('../services/email.service');
const { createError } = require('../middlewares/error.middleware');
const { ERROR_CODES, ROLES } = require('../utils/constants');

// -----------------------------------------------------------------
// RETIREMENT STATUS CONSTANTS (mirrors retirement_status enum in DB)
// -----------------------------------------------------------------
const RETIREMENT_STATUS = Object.freeze({
  PENDING:   'Pending',
  ASSESSED:  'Assessed',
  PAID:      'Paid',
  COMPLETED: 'Completed',
});

// -----------------------------------------------------------------
// HANDLERS
// -----------------------------------------------------------------

/**
 * POST /api/retirement/submit
 * Applicant submits a retirement request for one of their businesses.
 */
const submitRetirement = async (req, res, next) => {
  try {
    const { business_id, reason, cessation_date, final_gross_sales } = req.body;
    const userId = req.user.userId;

    // 1. Validation
    if (!business_id || !reason || !cessation_date) {
      throw createError(
        'business_id, reason, and cessation_date are required.',
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (final_gross_sales !== undefined && final_gross_sales < 0) {
      throw createError(
        'final_gross_sales cannot be negative.',
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // 2. Ownership check — business must belong to the applicant's taxpayer record
    const { data: business, error: bizErr } = await supabaseAdmin
      .from('businesses')
      .select('business_id, taxpayer_id, is_retired')
      .eq('business_id', business_id)
      .single();

    if (bizErr || !business) {
      throw createError('Business not found.', 404, ERROR_CODES.NOT_FOUND);
    }

    // Verify ownership via taxpayer_id linked to the user
    const { data: taxpayer, error: tpErr } = await supabaseAdmin
      .from('taxpayers')
      .select('taxpayer_id')
      .eq('user_id', userId)
      .single();

    if (tpErr || !taxpayer) {
      throw createError('Taxpayer profile not found.', 404, ERROR_CODES.NOT_FOUND);
    }

    if (business.taxpayer_id !== taxpayer.taxpayer_id) {
      throw createError('You do not own this business.', 403, ERROR_CODES.FORBIDDEN);
    }

    // 3. Guard: business must not already be retired
    if (business.is_retired) {
      throw createError('This business is already retired.', 409, ERROR_CODES.CONFLICT);
    }

    // 3b. Guard: business must have at least one 'Completed' permit application
    const { data: completedApp, error: compAppErr } = await supabaseAdmin
      .from('applications')
      .select('application_no')
      .eq('business_id', business_id)
      .eq('status', 'Completed')
      .limit(1)
      .maybeSingle();

    if (compAppErr || !completedApp) {
      throw createError(
        'This business is not eligible for retirement as it has never been successfully registered/completed.',
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // 4. Guard: no active (non-Completed) retirement application for this business
    const { data: existing, error: existErr } = await supabaseAdmin
      .from('retirement_applications')
      .select('id, status')
      .eq('business_id', business_id)
      .neq('status', RETIREMENT_STATUS.COMPLETED)
      .limit(1);

    if (!existErr && existing && existing.length > 0) {
      throw createError(
        'An active retirement application already exists for this business.',
        409,
        ERROR_CODES.CONFLICT
      );
    }

    // 5. Insert retirement application
    const { data: retirement, error: insertErr } = await supabaseAdmin
      .from('retirement_applications')
      .insert({
        business_id,
        submitted_by: userId,
        reason,
        cessation_date,
        final_gross_sales: final_gross_sales || 0,
        status: RETIREMENT_STATUS.PENDING,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[retirement.controller] Insert failed:', insertErr.message);
      throw createError('Failed to submit retirement application.', 500, ERROR_CODES.INTERNAL_ERROR);
    }

    // 6. Audit
    await logAction({
      userId,
      action: AUDIT_ACTIONS.RETIREMENT_SUBMITTED,
      entityType: 'retirement_applications',
      entityId: retirement.id,
      newValue: { business_id, reason, cessation_date, final_gross_sales },
      ipAddress: req.ip || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Retirement application submitted successfully.',
      data: retirement,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/retirement/my
 * Applicant views their own retirement applications.
 */
const getMyRetirements = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data, error } = await supabaseAdmin
      .from('retirement_applications')
      .select(`
        *,
        businesses ( business_name, trade_name )
      `)
      .eq('submitted_by', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/retirement/queue
 * BPLO Officer views pending retirement applications.
 */
const getRetirementQueue = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = supabaseAdmin
      .from('retirement_applications')
      .select(`
        *,
        businesses ( business_name, trade_name, address_line1, barangay )
      `)
      .order('created_at', { ascending: true });

    // Filter by status if provided, otherwise show all non-completed
    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.neq('status', RETIREMENT_STATUS.COMPLETED);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Enrich with submitter info from taxpayers table
    if (data && data.length > 0) {
      const submitterIds = [...new Set(data.map((r) => r.submitted_by))];
      const { data: taxpayers } = await supabaseAdmin
        .from('taxpayers')
        .select('user_id, first_name, last_name')
        .in('user_id', submitterIds);

      const taxpayerMap = {};
      if (taxpayers) {
        taxpayers.forEach((tp) => {
          taxpayerMap[tp.user_id] = tp;
        });
      }

      // Attach submitter info to each retirement record
      data.forEach((item) => {
        item.submitter = taxpayerMap[item.submitted_by] || null;
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/retirement/:id/acknowledge
 * BPLO Officer acknowledges and forwards to Treasury for assessment.
 */
const acknowledgeRetirement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // 1. Fetch current retirement
    const { data: retirement, error: fetchErr } = await supabaseAdmin
      .from('retirement_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !retirement) {
      throw createError('Retirement application not found.', 404, ERROR_CODES.NOT_FOUND);
    }

    // 2. Guard: must be Pending
    if (retirement.status !== RETIREMENT_STATUS.PENDING) {
      throw createError(
        `Cannot acknowledge. Current status is "${retirement.status}".`,
        409,
        ERROR_CODES.CONFLICT
      );
    }

    // 3. Update
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('retirement_applications')
      .update({
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 4. Audit
    await logAction({
      userId,
      action: AUDIT_ACTIONS.APPLICATION_STATUS_UPDATED,
      entityType: 'retirement_applications',
      entityId: id,
      oldValue: { status: retirement.status },
      newValue: { acknowledged_by: userId },
      ipAddress: req.ip || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Retirement acknowledged and forwarded to Treasury for assessment.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/retirement/:id/assess
 * Treasury Officer creates the final tax assessment for the retirement.
 * NOTE: We store assessment data as JSON metadata on the retirement record
 * because the assessments table requires a non-null application_no FK.
 */
const assessRetirement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { line_items } = req.body; // Array of { fee_type_id, amount }
    const userId = req.user.userId;

    // 1. Fetch retirement
    const { data: retirement, error: fetchErr } = await supabaseAdmin
      .from('retirement_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !retirement) {
      throw createError('Retirement application not found.', 404, ERROR_CODES.NOT_FOUND);
    }

    // 2. Guard: must be Pending (acknowledged or not)
    if (retirement.status !== RETIREMENT_STATUS.PENDING) {
      throw createError(
        `Cannot assess. Current status is "${retirement.status}".`,
        409,
        ERROR_CODES.CONFLICT
      );
    }

    // 3. Validate line_items
    if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
      throw createError(
        'At least one fee line item is required for assessment.',
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const totalAmount = line_items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    if (totalAmount <= 0) {
      throw createError('Total assessment amount must be greater than zero.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    // 4. Update retirement: store total in final_gross_sales (repurposed as assessed_amount)
    //    and transition to Assessed. We store line_items as metadata via audit log.
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('retirement_applications')
      .update({
        status: RETIREMENT_STATUS.ASSESSED,
        final_gross_sales: totalAmount, // Repurpose: after assessment, this holds the amount due
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 5. Audit (includes line_items for record-keeping)
    await logAction({
      userId,
      action: AUDIT_ACTIONS.RETIREMENT_ASSESSED,
      entityType: 'retirement_applications',
      entityId: id,
      oldValue: { status: RETIREMENT_STATUS.PENDING, final_gross_sales: retirement.final_gross_sales },
      newValue: { status: RETIREMENT_STATUS.ASSESSED, total_amount: totalAmount, line_items },
      ipAddress: req.ip || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Retirement assessed. Applicant can now pay via OTC.',
      data: {
        retirement: updated,
        assessment: {
          total_amount: totalAmount,
          line_items,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/retirement/:id/record-payment
 * Treasury Officer records OTC payment for a retirement.
 * NOTE: Since the assessments table requires application_no (NOT NULL FK),
 * retirement payments are tracked directly on the retirement record.
 * The OR number and payment details are stored in the audit log.
 */
const recordRetirementPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { or_number, amount_tendered, tendered_type, check_number, bank_name } = req.body;
    const userId = req.user.userId;

    // 1. Validate tendered type
    if (!['Cash', 'Manager Check'].includes(tendered_type)) {
      throw createError('OTC only accepts Cash or Manager Check.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    if (tendered_type === 'Manager Check' && (!check_number || !bank_name)) {
      throw createError('Check number and Bank name are required for Manager Check.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    if (!or_number) {
      throw createError('OR number is required.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    // 2. Fetch retirement
    const { data: retirement, error: fetchErr } = await supabaseAdmin
      .from('retirement_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !retirement) {
      throw createError('Retirement application not found.', 404, ERROR_CODES.NOT_FOUND);
    }

    // 3. Guard: must be Assessed
    if (retirement.status !== RETIREMENT_STATUS.ASSESSED) {
      throw createError(
        `Cannot record payment. Current status is "${retirement.status}".`,
        409,
        ERROR_CODES.CONFLICT
      );
    }

    // The assessed amount is stored in final_gross_sales after assessment
    const totalAmount = Number(retirement.final_gross_sales || 0);

    if (Number(amount_tendered) < totalAmount) {
      throw createError('Tendered amount is less than the total amount due.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const changeAmount = Number(amount_tendered) - totalAmount;

    // 4. Transition retirement to Paid
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('retirement_applications')
      .update({ status: RETIREMENT_STATUS.PAID })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 5. Audit — store full payment details in the audit log
    await logAction({
      userId,
      action: AUDIT_ACTIONS.PAYMENT_RECORDED,
      entityType: 'retirement_applications',
      entityId: id,
      newValue: {
        or_number,
        amount_due: totalAmount,
        amount_tendered: Number(amount_tendered),
        change_amount: changeAmount,
        tendered_type,
        check_number: check_number || null,
        bank_name: bank_name || null,
        paid_at: new Date().toISOString(),
      },
      ipAddress: req.ip || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Payment recorded. Retirement can now be completed.',
      data: {
        retirement: updated,
        payment: {
          or_number,
          amount_due: totalAmount,
          amount_tendered: Number(amount_tendered),
          change_amount: changeAmount,
          tendered_type,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/retirement/:id/complete
 * BPLO or Treasury Officer finalizes the retirement.
 * Sets businesses.is_retired = true.
 */
const completeRetirement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // 1. Fetch retirement
    const { data: retirement, error: fetchErr } = await supabaseAdmin
      .from('retirement_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !retirement) {
      throw createError('Retirement application not found.', 404, ERROR_CODES.NOT_FOUND);
    }

    // 2. Guard: must be Paid
    if (retirement.status !== RETIREMENT_STATUS.PAID) {
      throw createError(
        `Cannot complete. Current status is "${retirement.status}". Payment must be recorded first.`,
        409,
        ERROR_CODES.CONFLICT
      );
    }

    // 3. Transition to Completed
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('retirement_applications')
      .update({
        status: RETIREMENT_STATUS.COMPLETED,
        completed_by: userId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 4. CRITICAL: Set businesses.is_retired = true
    const { error: bizErr } = await supabaseAdmin
      .from('businesses')
      .update({ is_retired: true })
      .eq('business_id', retirement.business_id);

    if (bizErr) {
      // Rollback retirement status if business update fails
      await supabaseAdmin
        .from('retirement_applications')
        .update({ status: RETIREMENT_STATUS.PAID, completed_by: null, completed_at: null })
        .eq('id', id);
      throw createError('Failed to mark business as retired.', 500, ERROR_CODES.INTERNAL_ERROR);
    }

    // 5. Audit
    await logAction({
      userId,
      action: AUDIT_ACTIONS.RETIREMENT_COMPLETED,
      entityType: 'retirement_applications',
      entityId: id,
      oldValue: { status: RETIREMENT_STATUS.PAID },
      newValue: { status: RETIREMENT_STATUS.COMPLETED, is_retired: true },
      ipAddress: req.ip || null,
    });

    // Return response immediately — email is fire-and-forget below.
    res.status(200).json({
      success: true,
      message: 'Business retirement completed. The business is now officially retired.',
      data: updated,
    });

    // Phase 9: Wire RETIREMENT_COMPLETE email trigger.
    // Resolve the applicant via businesses → taxpayers → users join using business_id.
    const { data: retirementBiz } = await supabaseAdmin
      .from('businesses')
      .select('business_name, taxpayers ( first_name, last_name, users ( email ) )')
      .eq('business_id', retirement.business_id)
      .single();

    const retireeTaxpayer = retirementBiz?.taxpayers;
    const retireeUser     = retireeTaxpayer?.users;

    if (retireeTaxpayer && retireeUser?.email) {
      dispatchEmail({
        triggerEvent:   EMAIL_TRIGGERS.RETIREMENT_COMPLETE,
        recipientEmail: retireeUser.email,
        applicationNo:  null, // Retirement has no application_no
        payload: {
          name:         `${retireeTaxpayer.first_name} ${retireeTaxpayer.last_name}`,
          businessName: retirementBiz?.business_name || 'your business',
          retirementId: id,
          cessationDate: retirement.cessation_date ? new Date(retirement.cessation_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A',
          completedAt:  updated.completed_at,
        },
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/retirement/my-businesses
 * Returns the applicant's active (non-retired) businesses for the retirement form dropdown.
 */
const getMyBusinesses = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Get taxpayer_id for this user
    const { data: taxpayer, error: tpErr } = await supabaseAdmin
      .from('taxpayers')
      .select('taxpayer_id')
      .eq('user_id', userId)
      .single();

    if (tpErr || !taxpayer) {
      return res.status(200).json({ success: true, data: [] });
    }

    // 1. Fetch all unique business_ids belonging to this taxpayer that have a 'Completed' application
    const { data: completedApps, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('business_id')
      .eq('status', 'Completed');

    if (appErr) throw appErr;

    const completedBizIds = [...new Set(completedApps?.map((app) => app.business_id).filter(Boolean))];

    if (completedBizIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // 2. Fetch active businesses matching those IDs
    const { data: businesses, error: bizErr } = await supabaseAdmin
      .from('businesses')
      .select('business_id, business_name, trade_name, address_line1, barangay')
      .eq('taxpayer_id', taxpayer.taxpayer_id)
      .eq('is_retired', false)
      .in('business_id', completedBizIds)
      .order('business_name', { ascending: true });

    if (bizErr) throw bizErr;

    return res.status(200).json({ success: true, data: businesses || [] });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/retirement/:id
 * Get a single retirement application detail.
 */
const getRetirementDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('retirement_applications')
      .select(`
        *,
        businesses ( business_name, trade_name, address_line1, barangay )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw createError('Retirement application not found.', 404, ERROR_CODES.NOT_FOUND);
    }

    // Enrich with submitter info
    if (data.submitted_by) {
      const { data: taxpayer } = await supabaseAdmin
        .from('taxpayers')
        .select('first_name, last_name')
        .eq('user_id', data.submitted_by)
        .single();
      data.submitter = taxpayer || null;
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitRetirement,
  getMyRetirements,
  getMyBusinesses,
  getRetirementQueue,
  acknowledgeRetirement,
  assessRetirement,
  recordRetirementPayment,
  completeRetirement,
  getRetirementDetail,
};
