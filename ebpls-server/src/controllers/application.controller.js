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

module.exports = {
  getDraft,
  saveDraft,
  submitUAF,
  requestUploadUrl,
  getStatus,
  getApplicationsList,
};