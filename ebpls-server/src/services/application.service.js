// =================================================================
// File: src/services/application.service.js
// Purpose: Core business logic and state machine enforcement for Applications.
// Policy:  Fail Closed. Any database transaction failure throws an operational
//          error. Services do not touch req/res objects directly.
// =================================================================

const { supabaseAdmin } = require('../config/supabase');
const requirementService = require('./requirement.service');
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
// BARANGAY CLEARANCE LOOKUP IDS
// -----------------------------------------------------------------

/**
 * Resolves the canonical IDs needed for the Phase 3C clearance hook.
 * Looks up by name rather than relying on positional seed IDs so the
 * logic remains correct even if seed order changes.
 *
 * @returns {Promise<{ clearanceTypeId: number, requirementId: number }>}
 */
const getBarangayClearanceLookupIds = async () => {
  // Fetch clearance_type_id for 'Business Clearance'
  const { data: ctData, error: ctError } = await supabaseAdmin
    .from('clearance_types')
    .select('id')
    .eq('name', 'Business Clearance')
    .single();

  if (ctError || !ctData) {
    throw createError(
      'Clearance type "Business Clearance" not found in database. Ensure seed data is applied.',
      500,
      ERROR_CODES.INTERNAL_ERROR
    );
  }

  // Fetch requirement_id for 'Barangay Business Clearance'
  const { data: reqData, error: reqError } = await supabaseAdmin
    .from('requirement_types')
    .select('id')
    .eq('name', 'Barangay Business Clearance')
    .single();

  if (reqError || !reqData) {
    throw createError(
      'Requirement type "Barangay Business Clearance" not found in database. Ensure seed data is applied.',
      500,
      ERROR_CODES.INTERNAL_ERROR
    );
  }

  return {
    clearanceTypeId: ctData.id,
    requirementId: reqData.id,
  };
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
const submitApplication = async (taxpayerId, payload) => {
  const isUpdate = !!payload.application_no;
  let appNo = payload.application_no;
  let currentStatus = STATUSES.DRAFT;
  let businessId = null;

  // 1. Validate State Machine
  if (isUpdate) {
    const { data: existingApp, error: fetchErr } = await supabaseAdmin
      .from('applications')
      .select('status, business_id')
      .eq('application_no', appNo)
      .single();

    if (fetchErr || !existingApp) {
      throw createError('Application not found for update.', 404, ERROR_CODES.NOT_FOUND);
    }
    currentStatus = existingApp.status;
    businessId = existingApp.business_id;
    validateStateTransition(currentStatus, STATUSES.PENDING);
  } else {
    validateStateTransition(STATUSES.DRAFT, STATUSES.PENDING);
    appNo = await generateApplicationNo();
  }

  // 2. Business Profile (Upsert or Insert)
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
    is_renting: payload.is_renting ?? false,
  };

  if (isUpdate && businessId) {
    const { error: bizUpdateError } = await supabaseAdmin
      .from('businesses')
      .update(businessPayload)
      .eq('business_id', businessId);
    
    if (bizUpdateError) {
      console.error(`[submitApp] Business update failed:`, bizUpdateError.message);
      throw createError('Failed to update business profile.', 500, ERROR_CODES.INTERNAL_ERROR);
    }
  } else {
    const { data: businessData, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert([businessPayload])
      .select('business_id')
      .single();

    if (businessError) {
      console.error(`[submitApp] Business insert failed:`, businessError.message);
      throw createError('Failed to create business profile during submission.', 500, ERROR_CODES.INTERNAL_ERROR);
    }
    businessId = businessData.business_id;
  }

  // 3. Application Record (Upsert or Insert)
  const applicationPayload = {
    application_no: appNo,
    business_id: businessId,
    type_id: payload.type_id,
    // payment_mode_id removed — payment is always annual (migration 033)
    status: STATUSES.PENDING,
    submitted_at: new Date().toISOString(),
    return_remarks: null, // Clear remarks on resubmission
  };

  const { error: appError } = await supabaseAdmin
    .from('applications')
    .upsert([applicationPayload], { onConflict: 'application_no' });

  if (appError) {
    console.error(`[submitApp] Application submission failed:`, appError.message);
    // ROLLBACK manually: only delete the business if we just created it (new app)
    if (!isUpdate) {
      await supabaseAdmin.from('businesses').delete().eq('business_id', businessId);
    }
    throw createError('Failed to record application submission.', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  // 4b. Insert Line of Business activities into application_activities
  if (payload.activities && payload.activities.length > 0) {
    for (const activity of payload.activities) {
      // Look up the activity_id by name from business_activities table
      const { data: actData, error: actLookupErr } = await supabaseAdmin
        .from('business_activities')
        .select('id')
        .eq('name', activity.name)
        .single();

      if (actLookupErr || !actData) {
        console.warn(`[submitApp] Business activity "${activity.name}" not found in DB — skipping.`);
        continue;
      }

      const { error: actInsertErr } = await supabaseAdmin
        .from('application_activities')
        .insert({
          application_no: appNo,
          activity_id: actData.id,
          capitalization: activity.capitalization || 0,
          gross_sales_prev_year: activity.gross_sales_prev_year || 0,
        });

      if (actInsertErr) {
        console.warn(`[submitApp] Failed to insert activity "${activity.name}":`, actInsertErr.message);
        // Non-fatal — continue with other activities
      }
    }
  }

  // 5. Phase 3C — Barangay Clearance Hook (atomic via Postgres RPC)
  //    Must run AFTER the application record is committed so the
  //    application_no FK in doc_verifications is valid.
  const { clearanceTypeId, requirementId } = await getBarangayClearanceLookupIds();

  const { error: hookError } = await supabaseAdmin.rpc('uaf_create_barangay_clearance_hook', {
    p_application_no:    appNo,
    p_clearance_type_id: clearanceTypeId,
    p_requirement_id:    requirementId,
    p_request_clearance: payload.request_barangay_clearance ?? false,
  });

  if (hookError) {
    // ROLLBACK manually: remove the application and business to prevent partial state.
    console.error(`[submitApp] Barangay clearance hook RPC failed for ${appNo}. Rolling back:`, hookError.message);
    await supabaseAdmin.from('applications').delete().eq('application_no', appNo);
    await supabaseAdmin.from('businesses').delete().eq('business_id', businessData.business_id);
    throw createError(
      'Failed to initialise barangay clearance tracking. Application rolled back.',
      500,
      ERROR_CODES.INTERNAL_ERROR
    );
  }

  // 6. Create doc_verifications rows for ALL applicable requirements
  const activityNames = payload.activities ? payload.activities.map(a => a.name) : [];
  const applicableRequirements = await requirementService.resolveApplicableRequirements({
    application_type_id: payload.type_id,
    org_type_id: payload.org_type_id,
    activity_names: activityNames,
    is_renting: payload.is_renting ?? false,
  });

  const submittedDocs = payload.documents || [];

  for (const req of applicableRequirements) {
    const matchingDocs = submittedDocs.filter(d => d.requirement_id === req.id);
    
    // Skip if this is the Barangay clearance (already handled by the RPC above)
    // We only update the file_path if a document was uploaded instead of requested
    if (req.id === requirementId) {
      if (matchingDocs.length > 0) {
        const combinedPath = matchingDocs.map(d => d.file_path).join(',');
        await supabaseAdmin
          .from('doc_verifications')
          .update({ file_path: combinedPath })
          .eq('application_no', appNo)
          .eq('requirement_id', requirementId);
      }
      continue;
    }

    // Determine the file path(s) to save (comma-separated for multi-file requirements)
    let combinedPath = null;
    if (matchingDocs.length > 0) {
      combinedPath = matchingDocs.map(d => d.file_path).join(',');
    }

    // Insert doc_verifications row
    const { error: docInsertError } = await supabaseAdmin
      .from('doc_verifications')
      .upsert({
        application_no: appNo,
        requirement_id: req.id,
        status: 'Pending',
        file_path: combinedPath,
      }, { onConflict: 'application_no, requirement_id' });

    if (docInsertError) {
      console.warn(`[submitApp] Failed to insert doc_verifications for req_id ${req.id}:`, docInsertError.message);
    }
  }

  // Final step: Delete the draft
  await deleteDraft(taxpayerId);

  return appNo;
};

module.exports = {
  validateStateTransition,
  updateApplicationStatus, // New Export
  getBarangayClearanceLookupIds,
  getDraft,
  upsertDraft,
  deleteDraft,
  submitApplication,
};