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
const { dispatchEmail, EMAIL_TRIGGERS } = require('../services/email.service');

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

/**
 * DELETE /api/applications/drafts
 * Discards the active draft for the authenticated user.
 */
const deleteDraft = async (req, res, next) => {
  try {
    const taxpayerId = req.user.taxpayerId;

    if (!taxpayerId) {
      throw createError('Taxpayer profile not found.', 403, ERROR_CODES.FORBIDDEN);
    }

    await applicationService.deleteDraft(taxpayerId);

    return res.status(200).json({
      success: true,
      message: 'Draft discarded successfully.',
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

    // Return the response immediately — email is non-blocking (fire-and-forget below)
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      data: {
        application_no: applicationNo,
      },
    });

    // Phase 9: Wire APPLICATION_SUBMITTED email trigger (fire-and-forget, after response)
    // Fetch the applicant's name for the email greeting — taxpayerId is already on req.user.
    // ASSUMPTION: taxpayer row always exists at this point (created during registration).
    const { supabaseAdmin } = require('../config/supabase');
    const { data: taxpayer } = await supabaseAdmin
      .from('taxpayers')
      .select('first_name, last_name')
      .eq('taxpayer_id', taxpayerId)
      .single();

    const fullName = taxpayer
      ? `${taxpayer.first_name} ${taxpayer.last_name}`
      : 'Applicant';

    dispatchEmail({
      triggerEvent:   EMAIL_TRIGGERS.APPLICATION_SUBMITTED,
      recipientEmail: req.user.email,
      applicationNo,
      payload: {
        name:           fullName,
        applicationNo,
        businessName:   validatedData.business_name,
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
        ),
        assessments (
          id,
          total_amount
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
        },
        assessments: data.assessments
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

    // 4. Fetch doc verification remarks AND existing file paths
    const { data: docRows } = await supabaseAdmin
      .from('doc_verifications')
      .select(`
        requirement_id,
        status,
        remarks,
        file_path,
        requirement_types ( name )
      `)
      .eq('application_no', app_no);

    // 5. Determine Barangay Clearance request status
    // If 'Barangay Business Clearance' exists but has no file_path, it means it was requested via municipality.
    const brgyReq = (docRows || []).find(d => d.requirement_types?.name === 'Barangay Business Clearance');
    const isBrgyRequested = brgyReq ? !brgyReq.file_path : false;

    // 6. Map requirement names back to doc_types for the wizard
    const REQ_NAME_TO_TYPE = {
      'DTI / SEC / CDA Registration':           'DTI_SEC_CDA',
      'Fire Safety Inspection Certificate':     'FIRE_SAFETY',
      'Sanitary Permit':                         'SANITARY_PERMIT',
      'Zoning Clearance':                        'ZONING_CLEARANCE',
      'Lease Contract / TCT':                    'LEASE_TCT',
      'Barangay Business Clearance':             'BARANGAY_CLEARANCE',
      'Community Tax Certificate':               'CTC',
      "Owner's Valid ID (Front)":               'VALID_ID_FRONT',
      "Owner's Valid ID (Back)":                'VALID_ID_BACK',
      "Sketch of Location":                     'SKETCH_LOCATION',
    };

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
        step4: {
          request_barangay_clearance: isBrgyRequested,
          documents: (docRows || [])
            .filter(d => d.file_path)
            .map(d => ({
              doc_type: REQ_NAME_TO_TYPE[d.requirement_types?.name] || `REQ_${d.requirement_id}`,
              file_path: d.file_path,
              file_name: d.file_path.split('/').pop() // approximation
            }))
        },
        // BPLO feedback — so applicant knows what to fix
        feedback: {
          data_reviews: (dataReviews || [])
            .filter((r) => r.status === 'Discrepancy')
            .map((r) => ({ section: r.section, remarks: r.remarks })),
          doc_reviews: (docRows || [])
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

const getActiveBarangays = async (req, res, next) => {
  try {
    const { supabaseAdmin } = require('../config/supabase');
    const { data, error } = await supabaseAdmin
      .from('barangays')
      .select('name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('[getActiveBarangays] Database error:', error.message);
      throw createError('Failed to fetch barangays.', 500, ERROR_CODES.INTERNAL_ERROR);
    }

    return res.status(200).json({
      success: true,
      data: data.map(b => b.name),
    });
  } catch (error) {
    next(error);
  }
};

const getUafLookups = async (req, res, next) => {
  try {
    const { supabaseAdmin } = require('../config/supabase');
    
    // Fetch active barangays
    const { data: barangays } = await supabaseAdmin.from('barangays').select('name').eq('is_active', true).order('name', { ascending: true });
    // Fetch active business activities
    const { data: activities } = await supabaseAdmin.from('business_activities').select('name').eq('is_active', true).order('name', { ascending: true });
    // Fetch organization types
    const { data: orgTypes } = await supabaseAdmin.from('organization_types').select('id, name').order('name', { ascending: true });

    return res.status(200).json({
      success: true,
      data: {
        barangays: barangays?.map(b => b.name) || [],
        business_activities: activities?.map(a => a.name) || [],
        organization_types: orgTypes || [],
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDraft,
  saveDraft,
  deleteDraft,
  submitUAF,
  requestUploadUrl,
  getStatus,
  getApplicationsList,
  getApplicationForEdit,
  getActiveBarangays,
  getUafLookups,
};