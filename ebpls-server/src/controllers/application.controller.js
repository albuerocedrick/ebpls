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
    // taxpayerId is strictly derived from the verified JWT
    const taxpayerId = req.user.userId;

    const draft = await applicationService.getDraft(taxpayerId);

    if (!draft) {
      // 404 is appropriate here, meaning "No draft found for this user"
      throw createError('No active draft found.', 404, ERROR_CODES.NOT_FOUND);
    }

    return res.status(200).json({
      success: true,
      data: draft,
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
    const taxpayerId = req.user.userId;

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
    const taxpayerId = req.user.userId;

    // Strict validation of the decomposed payload
    const validatedData = validators.UAFSubmissionPayloadSchema.parse(req.body);

    // Core business logic (pseudo-atomic insert sequence)
    const applicationNo = await applicationService.submitApplication(taxpayerId, validatedData);

    // TODO (Phase 9): Trigger 'APPLICATION_SUBMITTED' Email Notification here.
    console.log(`[application.controller] Application ${applicationNo} submitted successfully. Dispatching email...`);

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
    const taxpayerId = req.user.userId;

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
    const taxpayerId = req.user.userId;
    const { app_no } = req.params;

    // We must ensure the user asking for the status actually owns the business/application.
    // We do this by joining applications -> businesses -> taxpayers.
    const { supabaseAdmin } = require('../config/supabase');
    
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select(`
        status,
        updated_at,
        businesses!inner (
          taxpayer_id
        )
      `)
      .eq('application_no', app_no)
      .eq('businesses.taxpayer_id', taxpayerId)
      .single();

    if (error || !data) {
      // Return 404 instead of 403 to prevent enumeration attacks
      throw createError('Application not found.', 404, ERROR_CODES.NOT_FOUND);
    }

    return res.status(200).json({
      success: true,
      data: {
        application_no: app_no,
        status: data.status,
        last_updated: data.updated_at,
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
};