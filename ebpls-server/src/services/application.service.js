// =================================================================
// File: src/services/application.service.js
// Purpose: Core business logic and state machine enforcement for Applications.
// Policy:  Fail Closed. Any database transaction failure throws an operational
//          error. Services do not touch req/res objects directly.
// =================================================================

const { supabaseAdmin } = require('../config/supabase');
const { submitApplicantApplication } = require('./applicant-submission.service');
const { createError }   = require('../middlewares/error.middleware');
const { ERROR_CODES, STATUSES, VALID_TRANSITIONS } = require('../utils/constants');

// -----------------------------------------------------------------
// STATE MACHINE HELPERS
// -----------------------------------------------------------------

/**
 * Enforces strict linear progression of the application state machine.
 * UPDATED: Supports array-based transitions for branching (Phase 5).
 * 
 * @param {string} currentStatus - The current status of the application.
 * @param {string} targetStatus  - The requested new status.
 * @throws {Error} If the transition is illegal.
 */
const validateStateTransition = (currentStatus, targetStatus) => {
  // Special Case: BPLO can return an application from 'Under Review'
  if (currentStatus === STATUSES.UNDER_REVIEW && targetStatus === STATUSES.RETURNED) {
    return true;
  }
  
  // Special Case: Applicant resubmits a returned application
  if (currentStatus === STATUSES.RETURNED && targetStatus === STATUSES.PENDING) {
    return true;
  }

  // Standard forward progression check
  const allowedNextStatuses = VALID_TRANSITIONS[currentStatus];
  
  // Check if the target exists in the allowed list for the current status
  if (!allowedNextStatuses || !allowedNextStatuses.includes(targetStatus)) {
    console.warn(`[State Machine] Illegal transition attempt: ${currentStatus} -> ${targetStatus}`);
    throw createError(
      `Invalid state transition. Cannot move from ${currentStatus} to ${targetStatus}.`,
      409,
      ERROR_CODES.INVALID_TRANSITION
    );
  }

  return true;
};

/**
 * Updates an application's status in the database with state machine enforcement.
 * Added for Phase 5 transitions (e.g., PaymentProcessing, Paid).
 */
const updateApplicationStatus = async (applicationNo, newStatus, userId = null) => {
  // 1. Fetch current status
  const { data: app, error: fetchErr } = await supabaseAdmin
    .from('applications')
    .select('status')
    .eq('application_no', applicationNo)
    .single();

  if (fetchErr || !app) {
    throw createError('Application not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  // 2. Validate transition
  validateStateTransition(app.status, newStatus);

  // 3. Perform update
  const { error: updateErr } = await supabaseAdmin
    .from('applications')
    .update({ 
      status: newStatus,
      last_updated_by: userId,
      updated_at: new Date().toISOString()
    })
    .eq('application_no', applicationNo);

  if (updateErr) {
    console.error(`[application.service] Status update failed:`, updateErr.message);
    throw createError('Failed to update application status.', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  return { applicationNo, oldStatus: app.status, newStatus };
};

// -----------------------------------------------------------------
// DRAFT MANAGEMENT
// -----------------------------------------------------------------

/**
 * Retrieves the active application draft for a taxpayer.
 */
const getDraft = async (taxpayerId) => {
  const { data, error } = await supabaseAdmin
    .from('application_drafts')
    .select('current_step, form_data, updated_at')
    .eq('taxpayer_id', taxpayerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No draft exists
    throw createError('Unable to retrieve application draft.', 500, ERROR_CODES.INTERNAL_ERROR);
  }
  return data;
};

/**
 * Saves or updates a draft application for a taxpayer.
 */
const upsertDraft = async (taxpayerId, step, formData) => {
  const { error } = await supabaseAdmin
    .from('application_drafts')
    .upsert({ taxpayer_id: taxpayerId, current_step: step, form_data: formData }, { onConflict: 'taxpayer_id' });

  if (error) {
    console.error(`[application.service] upsertDraft failed for taxpayerId ${taxpayerId}:`, error.message);
    throw createError('Failed to save application draft.', 500, ERROR_CODES.INTERNAL_ERROR);
  }
};

/**
 * Deletes the active application draft for a taxpayer.
 */
const deleteDraft = async (taxpayerId) => {
  const { error } = await supabaseAdmin
    .from('application_drafts')
    .delete()
    .eq('taxpayer_id', taxpayerId);

  if (error) {
    console.error(`[application.service] deleteDraft failed for taxpayerId ${taxpayerId}:`, error.message);
    throw createError('Failed to delete application draft.', 500, ERROR_CODES.INTERNAL_ERROR);
  }
};

// -----------------------------------------------------------------
// FINAL SUBMISSION
// -----------------------------------------------------------------

/**
 * Decomposes the unified UAF payload into normalized database rows.
 * Enforces Draft -> Pending transition.
 * 
 * @param {string} taxpayerId - UUID of the taxpayer submitting the form.
 * @param {Object} payload    - Validated data matching UAFSubmissionPayloadSchema.
 * @returns {Promise<string>} The generated application number.
 */
const submitApplication = submitApplicantApplication;

module.exports = {
  validateStateTransition,
  updateApplicationStatus, // New Export
  getDraft,
  upsertDraft,
  deleteDraft,
  submitApplication,
};