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
  payment_date: z.iso.date(),
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
function paymentError(error) {
  if (error.code === '42501') return createError('You do not have permission for this payment.', 403);
  if (error.code === 'P0002') return createError(error.message, 404);
  if (error.code === '22023' || error.code === '23505') return createError(error.code === '23505' ? 'This bill already has a payment. Refresh and try again.' : error.message, 409);
  console.error('[treasury payment workflow]', error.code);
  return createError('Unable to save the payment. No changes were committed.', 500);
}

const submitPaymentProof = async (req, res, next) => {
  try {
    const input = SubmitProofSchema.parse(req.body);
    const owner = req.user.taxpayerId || req.user.userId;
    const path = input.proof_file_path;
    if (!path.startsWith(`${owner}/`) || path.includes('..') || !/\.(jpe?g|png|pdf)$/i.test(path)) {
      throw createError('Upload a PDF, JPG, or PNG using this account.', 400);
    }
    const { data: file, error: fileError } = await supabaseAdmin.storage.from('proof-of-payments').info(path);
    if (fileError || !file?.size || file.size > 5 * 1024 * 1024 ||
        !['application/pdf','image/jpeg','image/png'].includes(file.contentType)) {
      throw createError('Payment proof is missing or invalid. Upload a PDF, JPG, or PNG up to 5 MB.', 400);
    }
    const { data, error } = await supabaseAdmin.rpc('submit_online_payment_proof', {
      p_application_no: input.application_no, p_actor: req.user.userId, p_channel: input.payment_channel,
      p_reference: input.payment_reference_no, p_payment_date: input.payment_date, p_file: path,
    });
    if (error) throw paymentError(error);
    res.json({ success: true, message: 'Proof of payment submitted for Treasury verification.', data });
  } catch (error) { next(error); }
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


const proofDecisionFields = {
  proof_revision: z.number().int().positive().optional(),
  rejection_reason: z.string().trim().min(3).max(1000).optional(),
};
const legacyAction = z.enum(['VERIFY', 'CONFIRM', 'REJECT', 'verify', 'confirm', 'reject']);
const onlineChannels = ['GCash', 'Bank Transfer'];

function pendingProofsQuery(query) {
  return query.eq('verification_status', 'Pending').in('tendered_type', onlineChannels)
    .not('proof_file_path', 'is', null).is('or_number', null)
    .eq('assessments.applications.status', STATUSES.PAYMENT_VERIFICATION_PENDING);
}

const getPendingProofCount = async (_req, res, next) => {
  try {
    const { error, count } = await pendingProofsQuery(supabaseAdmin.from('transactions')
      .select('transaction_id,assessments!inner(applications!inner(status))', { count: 'exact', head: true }));
    if (error) throw createError('Unable to count pending payment proofs.', 500);
    res.json({ success: true, data: { count } });
  } catch (error) { next(error); }
};

const getPendingPaymentProofs = async (req, res, next) => {
  try {
    const { data, error } = await pendingProofsQuery(supabaseAdmin.from('transactions')
      .select(`
        transaction_id, assessment_id, tendered_type, amount_due, amount_tendered,
        payment_reference_no, payment_date, proof_file_path, proof_revision, verification_status,
        assessments!inner(application_no,total_amount,
          assessment_line_items(amount,fee_types(name)),
          applications!inner(status,businesses(business_name,trade_name,address_line1,barangay,
            taxpayers(first_name,middle_name,last_name,contact_no)))
        )
      `)).order('payment_date', { ascending: false }).order('transaction_id');
    if (error) {
      console.error('[treasury pending proofs]', error.message);
      throw createError('Unable to load pending payment proofs.', 500);
    }
    const proofs = await Promise.all(data.map(async ({ assessments, ...transaction }) => {
      const business = assessments.applications.businesses;
      const owner = business?.taxpayers;
      let proofUrl = null;
      try {
        proofUrl = await storageService.generatePresignedDownloadUrl(transaction.proof_file_path, 900, 'proof-of-payments');
      } catch (error) {
        console.warn('[treasury pending proofs] Unable to sign a stored proof.');
      }
      return {
        ...transaction,
        proof_url: proofUrl,
        application_no: assessments.application_no,
        business_name: business?.business_name || 'Business',
        trade_name: business?.trade_name || '',
        address: [business?.address_line1, business?.barangay].filter(Boolean).join(', '),
        barangay: business?.barangay || '',
        contact_no: owner?.contact_no || '',
        owner_name: [owner?.first_name, owner?.middle_name, owner?.last_name].filter(Boolean).join(' '),
        assessed_total: assessments.total_amount,
        line_items: assessments.assessment_line_items.map(item => ({ name: item.fee_types?.name, amount: item.amount })),
      };
    }));
    res.json({ success: true, data: proofs });
  } catch (error) { next(error); }
};

function decidePaymentProof(forcedDecision) {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const input = z.object({ ...proofDecisionFields, action: legacyAction.optional() }).parse(req.body || {});
      const decision = forcedDecision || (input.action?.toUpperCase() === 'REJECT' ? 'Rejected' : 'Verified');
      if (decision === 'Rejected' && !input.rejection_reason) throw createError('Enter a rejection reason of at least 3 characters.', 400);
      const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
      let transactionId = id;
      if (!uuid.test(transactionId)) {
        // Compatibility with the original cashier route that also accepted application numbers.
        const { data, error } = await supabaseAdmin.from('assessments')
          .select('transactions(transaction_id)').eq('application_no', z.string().min(1).max(20).parse(id)).maybeSingle();
        if (error) throw createError('Unable to load this payment.', 500);
        const transaction = Array.isArray(data?.transactions) ? data.transactions[0] : data?.transactions;
        transactionId = transaction?.transaction_id;
        if (!transactionId) throw createError('Payment proof not found.', 404);
      }
      const { data, error } = await supabaseAdmin.rpc('decide_online_payment_proof', {
        p_transaction_id: transactionId, p_actor: req.user.userId, p_decision: decision,
        p_reason: input.rejection_reason || null, p_revision: input.proof_revision || null,
      });
      if (error) throw paymentError(error);
      const { recipient, ...result } = data;
      res.json({ success: true, data: result });
      if (!data.already_decided && recipient?.email) {
        const common = {
          recipientEmail: recipient.email,
          applicationNo: data.application_no,
          payload: { name: [recipient.first_name, recipient.last_name].filter(Boolean).join(' '),
            applicationNo: data.application_no, businessName: recipient.business_name },
        };
        if (decision === 'Verified') {
          dispatchEmail({ ...common, triggerEvent: EMAIL_TRIGGERS.PAYMENT_RECORDED,
            payload: { ...common.payload, orNumber: data.or_number, amount: data.transaction.amount_due, paymentChannel: data.transaction.tendered_type } });
          dispatchEmail({ ...common, triggerEvent: EMAIL_TRIGGERS.PERMIT_READY });
        } else {
          dispatchEmail({ ...common, triggerEvent: EMAIL_TRIGGERS.PAYMENT_PROOF_REJECTED,
            payload: { ...common.payload, reason: data.transaction.rejection_reason } });
        }
      }
    } catch (error) { next(error); }
  };
}

const verifyPaymentProof = decidePaymentProof();
const rejectPaymentProof = decidePaymentProof('Rejected');

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
  getPendingProofCount,
  verifyPaymentProof,
  rejectPaymentProof,
  getTreasuryQueue,
  getFeeSchedule,
  lookupFeeSchedule
};
