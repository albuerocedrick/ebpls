// =================================================================
// File: src/controllers/application.controller.js
// Purpose: HTTP request handling for the Applicant Module (UAF Wizard).
// Policy:  Distrust All Client Data. Parse everything through Zod.
//          Extract user context strictly from req.user (Auth Middleware).
// =================================================================

const applicationService = require('../services/application.service');
const storageService     = require('../services/storage.service');
const validators         = require('../utils/validators');
const { createError }    = require('../middlewares/error.middleware');
const { ERROR_CODES }    = require('../utils/constants');

// -----------------------------------------------------------------
// 1. DRAFT ENDPOINTS
// -----------------------------------------------------------------

/**
 * GET /api/applications/drafts
 * Retrieves the active draft for the authenticated user.
 */
const getDraft = async (req, res, next) => {
  try {
    const taxpayerId = req.user.taxpayerId;
    const draft = await applicationService.getDraft(taxpayerId);

    // FIX: Instead of throwing a 404 error, return 200 with null data.
    // This prevents the browser console from showing ugly red fetch errors.
    return res.status(200).json({
      success: true,
      data: draft || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/applications/drafts
 * Saves or updates the active draft for the authenticated user.
 */
const saveDraft = async (req, res, next) => {
  try {
    const taxpayerId = req.user.taxpayerId;

    if (!taxpayerId) {
      throw createError('Taxpayer profile not found. Only registered applicants can save drafts.', 403, ERROR_CODES.FORBIDDEN);
    }

    // Validate body via Zod
    const validatedData = validators.DraftPayloadSchema.parse(req.body);

    await applicationService.upsertDraft(
      taxpayerId,
      validatedData.current_step,
      validatedData.form_data
    );

    return res.status(200).json({
      success: true,
      message: 'Draft saved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------------
// 2. SUBMISSION ENDPOINTS
// -----------------------------------------------------------------

/**
 * POST /api/applications/uaf
 * Finalizes the Unified Application Form and transitions to Pending.
 */
const submitUAF = async (req, res, next) => {
  try {
    const taxpayerId = req.user.taxpayerId;

    // Strict validation of the decomposed payload
    const validatedData = validators.UAFSubmissionPayloadSchema.parse(req.body);

    // Core business logic (pseudo-atomic insert sequence)
    const applicationNo = await applicationService.submitApplication(taxpayerId, validatedData);

    // TODO (Phase 9): Trigger 'APPLICATION_SUBMITTED' Email Notification here.
    console.log(`[application.controller] Application ${applicationNo} submitted successfully.`);

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      data: {
        application_no: applicationNo,
      },
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------------
// 3. UTILITY ENDPOINTS
// -----------------------------------------------------------------

/**
 * POST /api/applications/upload
 * Returns a 15-minute pre-signed URL to securely upload documents.
 */
const requestUploadUrl = async (req, res, next) => {
  try {
    const taxpayerId = req.user.taxpayerId;

    // Validate filename and strictly allow only PDF, JPEG, PNG
    const validatedData = validators.UploadRequestPayloadSchema.parse(req.body);

    const { signedUrl, path } = await storageService.generatePresignedUploadUrl(
      taxpayerId,
      validatedData.fileName
    );

    return res.status(200).json({
      success: true,
      data: {
        uploadUrl: signedUrl,
        filePath: path, // Client saves this path to include in the DB payload later
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/applications/:app_no/status
 * Polls the current state machine status of a specific application.
 */
const getStatus = async (req, res, next) => {
  try {
    const taxpayerId = req.user.taxpayerId;
    const { app_no } = req.params;

    const { supabaseAdmin } = require('../config/supabase');
    
    // FIX: Added return_remarks and business_name to the select query
    // so the frontend StatusTracker can display them.
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select(`
        status,
        updated_at,
        return_remarks,
        businesses!inner (
          taxpayer_id,
          business_name
        )
      `)
      .eq('application_no', app_no)
      .eq('businesses.taxpayer_id', taxpayerId)
      .single();

    if (error || !data) {
      throw createError('Application not found.', 404, ERROR_CODES.NOT_FOUND);
    }

    return res.status(200).json({
      success: true,
      data: {
        application_no: app_no,
        status: data.status,
        last_updated: data.updated_at,
        return_remarks: data.return_remarks,
        businesses: {
          business_name: data.businesses.business_name
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/applications/list
 * Retrieves all applications owned by the authenticated taxpayer.
 * Used by the Applicant Dashboard.
 */
const getApplicationsList = async (req, res, next) => {
  try {
    const taxpayerId = req.user.taxpayerId;
    const { supabaseAdmin } = require('../config/supabase');

    const { data, error } = await supabaseAdmin
      .from('applications')
      .select(`
        application_no,
        status,
        submitted_at,
        businesses!inner (
          business_name,
          taxpayer_id
        )
      `)
      .eq('businesses.taxpayer_id', taxpayerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw createError('Failed to retrieve applications.', 500, ERROR_CODES.INTERNAL_ERROR);
    }

    return res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/applications/:app_no/edit
 * Returns the full application data for resubmission after a return.
 * Includes business details, activities, documents, return remarks, and data review discrepancies.
 * Only works for applications in 'Returned' status owned by the authenticated taxpayer.
 */
const getApplicationForEdit = async (req, res, next) => {
  try {
    const taxpayerId = req.user.taxpayerId;
    const { app_no } = req.params;
    const { supabaseAdmin } = require('../config/supabase');

    // 1. Fetch application with full business data
    const { data: app, error: appError } = await supabaseAdmin
      .from('applications')
      .select(`
        application_no,
        status,
        type_id,
        payment_mode_id,
        return_remarks,
        businesses!inner (
          taxpayer_id,
          business_name,
          trade_name,
          org_type_id,
          dti_sec_cda_reg_no,
          is_franchise,
          franchisor_name,
          address_line1,
          barangay,
          city,
          province,
          latitude,
          longitude
        )
      `)
      .eq('application_no', app_no)
      .eq('businesses.taxpayer_id', taxpayerId)
      .single();

    if (appError || !app) {
      throw createError('Application not found.', 404, ERROR_CODES.NOT_FOUND);
    }

    if (app.status !== 'Returned') {
      throw createError('Only returned applications can be edited.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    // 2. Fetch activities
    const { data: activities } = await supabaseAdmin
      .from('application_activities')
      .select(`
        activity_id,
        capitalization,
        gross_sales_prev_year,
        business_activities ( name )
      `)
      .eq('application_no', app_no);

    // 3. Fetch data review discrepancies (remarks from BPLO)
    const { data: dataReviews } = await supabaseAdmin
      .from('application_data_reviews')
      .select('section, status, remarks')
      .eq('application_no', app_no);

    // 4. Fetch doc verification remarks
    const { data: docReviews } = await supabaseAdmin
      .from('doc_verifications')
      .select(`
        requirement_id,
        status,
        remarks,
        requirement_types ( name )
      `)
      .eq('application_no', app_no);

    const biz = app.businesses;

    return res.status(200).json({
      success: true,
      data: {
        application_no: app.application_no,
        return_remarks: app.return_remarks,
        // Pre-fill data for the wizard
        step1: {
          type_id: app.type_id,
          payment_mode_id: app.payment_mode_id,
          business_name: biz.business_name,
          trade_name: biz.trade_name,
          org_type_id: biz.org_type_id,
          dti_sec_cda_reg_no: biz.dti_sec_cda_reg_no,
          is_franchise: biz.is_franchise,
          franchisor_name: biz.franchisor_name,
        },
        step2: {
          address_line1: biz.address_line1,
          barangay: biz.barangay,
          city: biz.city,
          province: biz.province,
          latitude: biz.latitude,
          longitude: biz.longitude,
        },
        step3: {
          lineOfBusinesses: (activities || []).map((a) => ({
            name: a.business_activities?.name || '',
            capital_investment: String(a.capitalization || 0),
            units: 1,
          })),
        },
        // BPLO feedback — so applicant knows what to fix
        feedback: {
          data_reviews: (dataReviews || [])
            .filter((r) => r.status === 'Discrepancy')
            .map((r) => ({ section: r.section, remarks: r.remarks })),
          doc_reviews: (docReviews || [])
            .filter((d) => d.status === 'No' || d.status === 'Returned')
            .map((d) => ({
              requirement: d.requirement_types?.name || `Requirement ${d.requirement_id}`,
              status: d.status,
              remarks: d.remarks,
            })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDraft,
  saveDraft,
  submitUAF,
  requestUploadUrl,
  getStatus,
  getApplicationsList,
  getApplicationForEdit,
};