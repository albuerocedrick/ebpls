// =================================================================
// File: src/controllers/treasury.controller.js
// Purpose: Handles Assessment, BMBE Exemptions, OTC Payments, and Proof of Payment.
// Policy:  Strict RBAC enforcement and state machine validation.
// =================================================================

const assessmentService = require('../services/assessment.service');
const applicationService = require('../services/application.service');
const { logAction, AUDIT_ACTIONS } = require('../services/audit.service');
const { supabaseAdmin } = require('../config/supabase');
const { createError } = require('../middlewares/error.middleware');
const { ERROR_CODES, STATUSES } = require('../utils/constants');
const { dispatchEmail, EMAIL_TRIGGERS } = require('../services/email.service');
const pdfService = require('../services/pdf.service');
const { z } = require('zod');
const { UploadRequestPayloadSchema } = require('../utils/validators');
const storageService = require('../services/storage.service');

/**
 * Generates the initial fee assessment for a verified application.
 */
const assessApplication = (req, res) => res.status(410).json({ success: false, message: 'Assessment is generated automatically on BPLO approval.' });

/**
 * Finalizes an assessment and moves it to the For Payment stage.
 * Once finalized, the applicant can see the billing and submit payment.
 */
const finalizeAssessment = async (req, res, next) => {
  try {
    const { app_no } = req.params;

    const finalized = await assessmentService.finalizeAssessment(app_no, req.user.userId);

    // Return response immediately — TOP email generation is fire-and-forget below.
    res.status(200).json({
      success: true,
      message: 'Assessment finalized. Applicant can now view and pay.'
    });
    if (finalized.already_finalized) return;

    // Send TOP_GENERATED email with PDF attached.
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

      // Insert in-app notification
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
 * Compatibility responses for retired manual fee mutation endpoints.
 */
const overrideFeeItem = (req, res) => res.status(410).json({ success: false, message: 'Fee amounts are read-only. Arbitrary overrides are disabled.' });
const resetFeeItem = overrideFeeItem;

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
          base_amount,
          is_business_tax,
          computation,
          is_override,
          override_reason,
          fee_types (name)
        )
      `)
      .eq('application_no', app_no)
      .single();

    if (assError && assError.code !== 'PGRST116') throw createError('Unable to load assessment.', 500);
    if (!assessment) {
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

      // PERMIT_READY email
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

      // Insert in-app notification
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
 * Validation schemas for Proof of Payment (Phase 5)
 */
const ProofUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(255),
  fileType: z.string().refine(
    (type) => ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(type.toLowerCase()),
    { message: 'Only JPG, PNG, and PDF files are allowed.' }
  ),
});

const SubmitProofSchema = z.object({
  application_no: z.string().min(1, 'Application number is required'),
  payment_channel: z.enum(['Bank Transfer', 'GCash'], {
    errorMap: () => ({ message: 'Payment channel must be either Bank Transfer or GCash' })
  }),
  payment_reference_no: z.string().trim().min(3, 'Reference number must be at least 3 characters').max(100),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be in YYYY-MM-DD format'),
  proof_file_path: z.string().min(1, 'Proof file path is required'),
});

/**
 * POST /api/treasury/payments/proof-upload-url
 * Generates a presigned upload URL for proof-of-payments storage bucket.
 */
const getProofUploadUrl = async (req, res, next) => {
  try {
    const input = ProofUploadSchema.parse(req.body);
    const ownerId = req.user.taxpayerId || req.user.userId;

    const upload = await storageService.generatePresignedUploadUrl(ownerId, input.fileName, 'proof-of-payments');

    return res.status(200).json({
      success: true,
      data: {
        uploadUrl: upload.signedUrl,
        filePath: upload.path
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/treasury/payments/proof
 * Submits Bank Transfer / GCash deposit slip proof of payment.
 * Transitions application from 'For Payment' to 'PaymentVerificationPending'.
 */
const submitPaymentProof = async (req, res, next) => {
  try {
    const input = SubmitProofSchema.parse(req.body);
    const { application_no, payment_channel, payment_reference_no, payment_date, proof_file_path } = input;

    // 1. Fetch Application & verify ownership & status
    const { data: app, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('status, business_id, assessments(id, total_amount), businesses(taxpayer_id)')
      .eq('application_no', application_no)
      .single();

    if (appErr || !app) throw createError('Application not found.', 404, ERROR_CODES.NOT_FOUND);

    // Security: If applicant, must own the business
    if (req.user.roleName === 'Applicant' && app.businesses?.taxpayer_id !== req.user.taxpayerId) {
      throw createError('Access denied.', 403, ERROR_CODES.FORBIDDEN);
    }

    const payableStatuses = [
      STATUSES.FOR_PAYMENT, 
      STATUSES.PAYMENT_VERIFICATION_PENDING,
      STATUSES.PAYMENT_PROCESSING
    ];
    if (!payableStatuses.includes(app.status)) {
      throw createError(`Application is in ${app.status} status and is not in a payable state.`, 409, ERROR_CODES.CONFLICT);
    }

    const totalAmountRaw = Array.isArray(app.assessments) 
      ? app.assessments[0]?.total_amount 
      : app.assessments?.total_amount;

    const totalAmount = Number(totalAmountRaw || 0);
    if (totalAmount <= 0) {
      throw createError(`Invalid assessment amount (₱${totalAmount}). Please contact Treasury.`, 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const assessmentId = Array.isArray(app.assessments)
      ? app.assessments[0]?.id
      : app.assessments?.id;

    if (!assessmentId) {
      throw createError('No assessment found for this application.', 404, ERROR_CODES.NOT_FOUND);
    }

    // 2. Save transaction with proof details
    const { data: tx, error: txErr } = await supabaseAdmin
      .from('transactions')
      .upsert({
        assessment_id: assessmentId,
        amount_due: totalAmount,
        amount_tendered: totalAmount,
        change_amount: 0.00,
        tendered_type: payment_channel,
        payment_reference_no,
        payment_date,
        proof_file_path,
        verification_status: 'Pending',
        rejection_reason: null,
        paid_at: null, // confirmed by Cashier in Phase 6
        cashier_id: null
      }, { onConflict: 'assessment_id' })
      .select()
      .single();

    if (txErr) {
      console.error('[treasury.controller] Failed to save payment proof transaction:', txErr.message);
      throw createError(`Failed to save payment proof: ${txErr.message}`, 500, ERROR_CODES.INTERNAL_ERROR);
    }

    // 3. State Transition: For Payment -> PaymentVerificationPending
    if (app.status !== STATUSES.PAYMENT_VERIFICATION_PENDING) {
      await applicationService.updateApplicationStatus(
        application_no, 
        STATUSES.PAYMENT_VERIFICATION_PENDING, 
        req.user.userId
      );
    }

    // 4. Audit Log
    await logAction({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.PAYMENT_PROOF_SUBMITTED,
      entityType: 'transactions',
      entityId: tx?.transaction_id || application_no,
      newValue: {
        application_no,
        payment_channel,
        payment_reference_no,
        payment_date,
        proof_file_path,
        amount: totalAmount
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Proof of payment submitted successfully and is awaiting Treasury verification.',
      data: tx
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/treasury/payments/:app_no/proof
 * Retrieves presigned view URL for submitted proof of payment.
 */
const getPaymentProofUrl = async (req, res, next) => {
  try {
    const { app_no } = req.params;

    const { data: app, error: appErr } = await supabaseAdmin
      .from('applications')
      .select(`
        application_no,
        business_id,
        businesses(taxpayer_id),
        assessments(
          id,
          transactions(
            transaction_id,
            tendered_type,
            payment_reference_no,
            payment_date,
            proof_file_path,
            verification_status,
            rejection_reason,
            amount_due,
            amount_tendered
          )
        )
      `)
      .eq('application_no', app_no)
      .single();

    if (appErr || !app) throw createError('Application not found.', 404, ERROR_CODES.NOT_FOUND);

    if (req.user.roleName === 'Applicant' && app.businesses?.taxpayer_id !== req.user.taxpayerId) {
      throw createError('Access denied.', 403, ERROR_CODES.FORBIDDEN);
    }

    const assessment = Array.isArray(app.assessments) ? app.assessments[0] : app.assessments;
    const tx = Array.isArray(assessment?.transactions) ? assessment.transactions[0] : assessment?.transactions;

    if (!tx || !tx.proof_file_path) {
      throw createError('No proof of payment found for this application.', 404, ERROR_CODES.NOT_FOUND);
    }

    const url = await storageService.generatePresignedDownloadUrl(tx.proof_file_path, 900, 'proof-of-payments');

    return res.status(200).json({
      success: true,
      data: {
        url,
        transaction: tx
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch applications that are in statuses relevant to Treasury.
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
        STATUSES.PAYMENT_VERIFICATION_PENDING,
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
    
    if (items.length > 1 || items[0].tier_label !== null) {
      if (count !== null) {
        matchedItem = items.find(item => {
          const minMatch = item.tier_min === null || count >= item.tier_min;
          const maxMatch = item.tier_max === null || count <= item.tier_max;
          return minMatch && maxMatch;
        }) || items[0];
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

const BmbeSchema = z.object({
  enabled: z.boolean(), 
  certificate_path: z.string().min(1).optional(),
  authority_reference: z.string().trim().min(3).max(200).optional(),
  remarks: z.string().trim().min(3).max(500), 
  certificate_verified: z.boolean().optional(),
}).strict().refine(value => !value.enabled || (value.certificate_path && value.authority_reference && value.certificate_verified === true),
  { message: 'Upload and verify the DTI certificate and supply the approved LGU authority reference.' });

const updateBmbeExemption = async (req, res, next) => {
  try {
    const input = BmbeSchema.parse(req.body);
    const data = await assessmentService.updateBmbeExemption(req.params.app_no, req.user.userId, input);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

const uploadBmbeCertificate = async (req, res, next) => {
  try {
    const input = UploadRequestPayloadSchema.parse(req.body);
    const { data, error } = await supabaseAdmin.from('assessments').select('id,calculation_context,applications(status)').eq('application_no', req.params.app_no).maybeSingle();
    if (error) throw createError('Unable to load assessment.', 500);
    if (!data || !data.calculation_context || data.applications?.status !== STATUSES.ASSESSED) throw createError('Certificate upload is available before finalizing a new automatic assessment.', 409);
    const upload = await storageService.generatePresignedUploadUrl(req.user.userId, input.fileName);
    res.status(200).json({ success: true, data: { uploadUrl: upload.signedUrl, filePath: upload.path } });
  } catch (error) { next(error); }
};

const getBmbeCertificate = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('assessments').select('bmbe_certificate_path').eq('application_no', req.params.app_no).maybeSingle();
    if (error) throw createError('Unable to load certificate.', 500);
    if (!data?.bmbe_certificate_path) throw createError('Certificate not found.', 404);
    res.status(200).json({ success: true, data: { url: await storageService.generatePresignedDownloadUrl(data.bmbe_certificate_path, 900) } });
  } catch (error) { next(error); }
};


const VerifyProofSchema = z.object({
  action: z.enum(['VERIFY', 'CONFIRM', 'REJECT', 'verify', 'confirm', 'reject']),
  rejection_reason: z.string().trim().optional(),
}).refine(data => {
  const isReject = data.action.toUpperCase() === 'REJECT';
  return !isReject || (data.rejection_reason && data.rejection_reason.length >= 3);
}, {
  message: 'Rejection reason is required (at least 3 characters) when rejecting a payment proof.'
});

/**
 * GET /api/treasury/payments/pending-proofs
 * Returns all pending Bank Transfer / GCash deposit slips with signed preview URLs.
 */
const getPendingPaymentProofs = async (req, res, next) => {
  try {
    const { data: proofs, error } = await supabaseAdmin
      .from('transactions')
      .select(`
        transaction_id,
        assessment_id,
        tendered_type,
        amount_due,
        amount_tendered,
        payment_reference_no,
        payment_date,
        proof_file_path,
        verification_status,
        rejection_reason,
        paid_at,
        assessments (
          id,
          application_no,
          total_amount,
          applications (
            application_no,
            status,
            submitted_at,
            businesses (
              business_name,
              trade_name,
              address_line1,
              barangay,
              contact_no,
              taxpayers (
                first_name,
                middle_name,
                last_name,
                users (
                  email
                )
              )
            )
          )
        )
      `)
      .eq('verification_status', 'Pending')
      .not('proof_file_path', 'is', null)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('[treasury.controller] Failed to fetch pending proofs:', error.message);
      throw createError('Failed to fetch pending payment proofs.', 500, ERROR_CODES.INTERNAL_ERROR);
    }

    const proofsWithUrls = await Promise.all(
      (proofs || []).map(async (p) => {
        let proofUrl = null;
        if (p.proof_file_path) {
          try {
            proofUrl = await storageService.generatePresignedDownloadUrl(p.proof_file_path, 900, 'proof-of-payments');
          } catch (e) {
            console.warn('[treasury.controller] URL sign failed:', e.message);
          }
        }

        const app = p.assessments?.applications;
        const biz = app?.businesses;
        const tp = biz?.taxpayers;
        const ownerName = tp ? `${tp.first_name || ''} ${tp.last_name || ''}`.trim() : 'N/A';

        return {
          ...p,
          proof_url: proofUrl,
          application_no: p.assessments?.application_no || app?.application_no,
          business_name: biz?.business_name || 'Business',
          trade_name: biz?.trade_name || '',
          address: `${biz?.address_line1 ? biz.address_line1 + ', ' : ''}${biz?.barangay || ''}`,
          barangay: biz?.barangay || '',
          contact_no: biz?.contact_no || '',
          owner_name: ownerName,
          applicant_email: tp?.users?.email || '',
          amount_due: Number(p.amount_due || p.assessments?.total_amount || 0)
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: proofsWithUrls
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/treasury/payments/:id/verify-proof
 * Verifies or rejects submitted Bank Transfer / GCash deposit slip.
 * If Verified: confirms payment, generates OR number, transitions to Paid -> Completed, sends emails.
 * If Rejected: reverts to For Payment with remarks.
 */
const verifyPaymentProof = async (req, res, next) => {
  try {
    const { id } = req.params;
    const input = VerifyProofSchema.parse(req.body);
    const actionUpper = input.action.toUpperCase();

    // 1. Find transaction by transaction_id or application_no
    let tx = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .select(`
          *,
          assessments (
            id,
            application_no,
            total_amount,
            applications (
              application_no,
              status,
              businesses (
                business_name,
                taxpayers (
                  first_name,
                  last_name,
                  users (
                    email,
                    user_id
                  )
                )
              )
            )
          )
        `)
        .eq('transaction_id', id)
        .maybeSingle();

      if (!error && data) tx = data;
    }

    if (!tx) {
      const { data, error } = await supabaseAdmin
        .from('applications')
        .select(`
          application_no,
          status,
          businesses (
            business_name,
            taxpayers (
              first_name,
              last_name,
              users (
                email,
                user_id
              )
            )
          ),
          assessments (
            id,
            total_amount,
            transactions (
              *
            )
          )
        `)
        .eq('application_no', id)
        .single();

      if (error || !data) throw createError('Application or transaction not found.', 404, ERROR_CODES.NOT_FOUND);

      const ass = Array.isArray(data.assessments) ? data.assessments[0] : data.assessments;
      const t = Array.isArray(ass?.transactions) ? ass.transactions[0] : ass?.transactions;
      if (!t) throw createError('No payment transaction found for this application.', 404, ERROR_CODES.NOT_FOUND);

      tx = {
        ...t,
        assessments: {
          id: ass.id,
          application_no: data.application_no,
          total_amount: ass.total_amount,
          applications: data
        }
      };
    }

    const applicationNo = tx.assessments?.application_no || id;
    const appData = tx.assessments?.applications;
    const taxpayer = appData?.businesses?.taxpayers;
    const userInfo = taxpayer?.users;

    if (actionUpper === 'VERIFY' || actionUpper === 'CONFIRM') {
      let or_number = tx.or_number;
      if (!or_number) {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const { count, error: countErr } = await supabaseAdmin
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .like('or_number', `OTC-${today}-%`);

        const sequence = String((count || 0) + 1).padStart(6, '0');
        or_number = countErr
          ? `OTC-${today}-${require('crypto').randomUUID().slice(0, 6)}`
          : `OTC-${today}-${sequence}`;
      }

      const { data: updatedTx, error: txErr } = await supabaseAdmin
        .from('transactions')
        .update({
          verification_status: 'Verified',
          rejection_reason: null,
          or_number: or_number,
          verified_by: req.user.userId,
          verified_at: new Date().toISOString(),
          paid_at: new Date().toISOString(),
          cashier_id: req.user.userId
        })
        .eq('transaction_id', tx.transaction_id)
        .select()
        .single();

      if (txErr) {
        console.error('[treasury.controller] Failed to verify transaction:', txErr.message);
        throw createError(`Failed to update transaction: ${txErr.message}`, 500, ERROR_CODES.INTERNAL_ERROR);
      }

      await applicationService.updateApplicationStatus(applicationNo, STATUSES.PAID, req.user.userId);
      await applicationService.updateApplicationStatus(applicationNo, STATUSES.COMPLETED, req.user.userId);

      await logAction({
        userId: req.user.userId,
        action: AUDIT_ACTIONS.PAYMENT_PROOF_VERIFIED,
        entityType: 'transactions',
        entityId: tx.transaction_id,
        newValue: {
          application_no: applicationNo,
          or_number,
          verified_by: req.user.userId,
          amount: tx.amount_due
        }
      });

      if (taxpayer && userInfo?.email) {
        dispatchEmail({
          triggerEvent: EMAIL_TRIGGERS.PAYMENT_RECORDED,
          recipientEmail: userInfo.email,
          applicationNo,
          payload: {
            name: `${taxpayer.first_name} ${taxpayer.last_name}`,
            applicationNo,
            businessName: appData?.businesses?.business_name || 'your business',
            orNumber: or_number,
            amount: tx.amount_due,
            paymentChannel: `${tx.tendered_type} (Verified Deposit)`,
          },
        });

        dispatchEmail({
          triggerEvent: EMAIL_TRIGGERS.PERMIT_READY,
          recipientEmail: userInfo.email,
          applicationNo,
          payload: {
            name: `${taxpayer.first_name} ${taxpayer.last_name}`,
            applicationNo,
            businessName: appData?.businesses?.business_name || 'your business',
          },
        });

        if (userInfo.user_id) {
          supabaseAdmin.from('notifications').insert({
            user_id: userInfo.user_id,
            application_no: applicationNo,
            type: 'PAYMENT_CONFIRMED',
            title: 'Payment Confirmed & Verified',
            message: `Your ${tx.tendered_type} deposit has been verified. Official Receipt ${or_number} and Business Permit are ready for download.`,
            action_url: `/applicant/status?id=${applicationNo}`,
          }).then(({ error: notifErr }) => {
            if (notifErr) console.warn('[treasury.controller] Failed to insert notification:', notifErr.message);
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Payment confirmed and verified successfully.',
        data: {
          transaction: updatedTx,
          or_number
        }
      });
    }

    if (actionUpper === 'REJECT') {
      const reason = input.rejection_reason.trim();

      const { data: updatedTx, error: txErr } = await supabaseAdmin
        .from('transactions')
        .update({
          verification_status: 'Rejected',
          rejection_reason: reason,
          verified_by: req.user.userId,
          verified_at: new Date().toISOString()
        })
        .eq('transaction_id', tx.transaction_id)
        .select()
        .single();

      if (txErr) {
        throw createError(`Failed to reject transaction: ${txErr.message}`, 500, ERROR_CODES.INTERNAL_ERROR);
      }

      await applicationService.updateApplicationStatus(applicationNo, STATUSES.FOR_PAYMENT, req.user.userId);

      await logAction({
        userId: req.user.userId,
        action: AUDIT_ACTIONS.PAYMENT_PROOF_REJECTED,
        entityType: 'transactions',
        entityId: tx.transaction_id,
        newValue: {
          application_no: applicationNo,
          rejection_reason: reason,
          verified_by: req.user.userId
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Payment proof rejected and application returned to For Payment.',
        data: updatedTx
      });
    }

    throw createError('Invalid verification action.', 400, ERROR_CODES.VALIDATION_ERROR);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  updateBmbeExemption,
  uploadBmbeCertificate,
  getBmbeCertificate,
  assessApplication,
  finalizeAssessment,
  overrideFeeItem,
  resetFeeItem,
  getAssessmentByApp,
  recordOTCPayment,
  getProofUploadUrl,
  submitPaymentProof,
  getPaymentProofUrl,
  getPendingPaymentProofs,
  verifyPaymentProof,
  getTreasuryQueue,
  getFeeSchedule,
  lookupFeeSchedule
};
