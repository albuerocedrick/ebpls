// =================================================================
// File: src/services/application.service.js
// Purpose: Core business logic and state machine enforcement for Applications.
// Policy:  Fail Closed. Any database transaction failure throws an operational
//          error. Services do not touch req/res objects directly.
// =================================================================

const { supabaseAdmin } = require('../config/supabase');
const { createError }   = require('../middlewares/error.middleware');
const { ERROR_CODES, STATUSES, VALID_TRANSITIONS } = require('../utils/constants');

// -----------------------------------------------------------------
// STATE MACHINE HELPERS
// -----------------------------------------------------------------

/**
 * Enforces strict linear progression of the application state machine.
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
  const allowedNextStatus = VALID_TRANSITIONS[currentStatus];
  
  if (allowedNextStatus !== targetStatus) {
    console.warn(`[State Machine] Illegal transition attempt: ${currentStatus} -> ${targetStatus}`);
    throw createError(
      `Invalid state transition. Cannot move from ${currentStatus} to ${targetStatus}.`,
      409,
      ERROR_CODES.INVALID_TRANSITION
    );
  }

  return true;
};

// -----------------------------------------------------------------
// APPLICATION NUMBER GENERATOR
// -----------------------------------------------------------------

/**
 * Generates the sequential Application Number (e.g., APP-2026-00001).
 * ASSUMPTION: In extremely high concurrency, this REST-based MAX() query
 * could theoretically encounter a race condition. In a true enterprise 
 * scaling scenario, this should be replaced by a Postgres RPC using a SEQUENCE.
 * 
 * @returns {Promise<string>}
 */
const generateApplicationNo = async () => {
  const year = new Date().getFullYear();
  const prefix = `APP-${year}-`;

  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('application_no')
    .ilike('application_no', `${prefix}%`)
    .order('application_no', { ascending: false })
    .limit(1)
    .single();

  // PGRST116 means no rows found, which is fine (first app of the year)
  if (error && error.code !== 'PGRST116') {
    throw createError('Failed to generate Application Number.', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  let nextSequence = 1;
  if (data && data.application_no) {
    // Extract the NNNNN part from APP-YYYY-NNNNN
    const lastSequenceStr = data.application_no.split('-')[2];
    nextSequence = parseInt(lastSequenceStr, 10) + 1;
  }

  const paddedSequence = String(nextSequence).padStart(5, '0');
  return `${prefix}${paddedSequence}`;
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
const submitApplication = async (taxpayerId, payload) => {
  // 1. Validate State Machine (Implicitly, this is a Draft -> Pending action)
  validateStateTransition(STATUSES.DRAFT, STATUSES.PENDING);

  // 2. Generate the sequential ID
  const appNo = await generateApplicationNo();

  // 3. Insert Business Profile
  const businessPayload = {
    taxpayer_id: taxpayerId,
    business_name: payload.business_name,
    trade_name: payload.trade_name,
    org_type_id: payload.org_type_id,
    dti_sec_cda_reg_no: payload.dti_sec_cda_reg_no,
    is_franchise: payload.is_franchise,
    franchisor_name: payload.franchisor_name,
    address_line1: payload.address_line1,
    barangay: payload.barangay,
    city: payload.city,
    province: payload.province,
    latitude: payload.latitude,
    longitude: payload.longitude,
  };

  const { data: businessData, error: businessError } = await supabaseAdmin
    .from('businesses')
    .insert([businessPayload])
    .select('business_id')
    .single();

  if (businessError) {
    console.error(`[submitApp] Business insert failed:`, businessError.message);
    throw createError('Failed to create business profile during submission.', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  // 4. Insert Application Record
  const applicationPayload = {
    application_no: appNo,
    business_id: businessData.business_id,
    type_id: payload.type_id,
    payment_mode_id: payload.payment_mode_id,
    status: STATUSES.PENDING,
    submitted_at: new Date().toISOString(),
  };

  const { error: appError } = await supabaseAdmin
    .from('applications')
    .insert([applicationPayload]);

  if (appError) {
    // ROLLBACK manually: delete the business we just created to prevent orphaned data
    console.error(`[submitApp] Application insert failed. Rolling back business ${businessData.business_id}:`, appError.message);
    await supabaseAdmin.from('businesses').delete().eq('business_id', businessData.business_id);
    throw createError('Failed to create application record.', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  // 5. Delete the temporary draft now that submission is fully successful
  const { error: draftError } = await supabaseAdmin
    .from('application_drafts')
    .delete()
    .eq('taxpayer_id', taxpayerId);

  if (draftError) {
    // Non-fatal error. The submission succeeded, but cleanup failed. Log it.
    console.warn(`[submitApp] Draft cleanup failed for taxpayer ${taxpayerId}. Orphaned draft remains.`);
  }

  return appNo;
};

module.exports = {
  validateStateTransition,
  getDraft,
  upsertDraft,
  submitApplication,
};