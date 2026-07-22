// =================================================================
// File: src/controllers/bplo.controller.js
// Purpose: BPLO module handlers for verification workflow.
//          Handles pending queue retrieval, verification, and return flow.
// =================================================================

const { z } = require('zod');
const { supabaseAdmin } = require('../config/supabase');
const { createError } = require('../middlewares/error.middleware');
const { successResponse, getClientIp } = require('../utils/helpers');
const { ERROR_CODES, STATUSES, DOC_VERIFICATION_STATUS } = require('../utils/constants');
const { logAction, AUDIT_ACTIONS } = require('../services/audit.service');
const { generatePresignedDownloadUrl } = require('../services/storage.service');
const { dispatchEmail, EMAIL_TRIGGERS } = require('../services/email.service');

// -----------------------------------------------------------------
// SHARED HELPER: Resolve applicant contact info for email dispatch.
// Follows the application → businesses → taxpayers → users chain.
// Returns null if any join fails — email dispatch will be skipped safely.
// -----------------------------------------------------------------
const _resolveApplicantForEmail = async (applicationNo) => {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select(`
      application_no,
      businesses (
        business_name,
        taxpayers (
          first_name,
          last_name,
          users ( email )
        )
      )
    `)
    .eq('application_no', applicationNo)
    .single();

  if (error || !data) {
    console.warn(`[bplo.controller] Could not resolve applicant for email on app ${applicationNo}:`, error?.message);
    return null;
  }

  const taxpayer = data.businesses?.taxpayers;
  const user     = taxpayer?.users;

  if (!taxpayer || !user?.email) return null;

  return {
    email:        user.email,
    name:         `${taxpayer.first_name} ${taxpayer.last_name}`,
    businessName: data.businesses?.business_name || 'your business',
  };
};

const verifySchema = z.object({
  checklist: z.array(
    z.object({
      requirementId: z.coerce.number().int().positive(),
      status: z.enum([
        DOC_VERIFICATION_STATUS.PENDING,
        DOC_VERIFICATION_STATUS.VERIFIED,
        DOC_VERIFICATION_STATUS.YES,
        DOC_VERIFICATION_STATUS.NO,
        DOC_VERIFICATION_STATUS.RETURNED,
        DOC_VERIFICATION_STATUS.NOT_NEEDED,
        DOC_VERIFICATION_STATUS.AWAITING_ISSUANCE,
      ]),
      remarks: z.string().trim().optional().nullable(),
    })
  ).min(1, 'Checklist is required.'),
});

const returnSchema = z.object({
  remarks: z.string().trim().min(1, 'Return remarks are required.'),
});

const getPendingApplications = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select(`
        application_no,
        status,
        submitted_at,
        updated_at,
        businesses (
          business_name
        )
      `)
      .in('status', [STATUSES.PENDING, STATUSES.UNDER_REVIEW])
      .order('submitted_at', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('[bplo.controller] Failed to fetch pending applications:', error.message);
      return next(createError(
        'Failed to load pending applications.',
        500,
        ERROR_CODES.INTERNAL_ERROR
      ));
    }

    return res.status(200).json(
      successResponse('Pending applications fetched successfully.', data || [])
    );
  } catch (err) {
    return next(err);
  }
};

/**
 * PUT /api/bplo/applications/start-review/:app_no
 * Transitions an application from Pending → Under Review when a BPLO officer opens it.
 * Idempotent: if already Under Review, does nothing.
 */
const startReview = async (req, res, next) => {
  try {
    const { app_no: applicationNo } = req.params;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('applications')
      .select('application_no, status')
      .eq('application_no', applicationNo)
      .single();

    if (existingError || !existing) {
      return next(createError('Application not found.', 404, ERROR_CODES.NOT_FOUND));
    }

    // Already Under Review — idempotent, just return success
    if (existing.status === STATUSES.UNDER_REVIEW) {
      return res.status(200).json(successResponse('Application is already under review.'));
    }

    // Only transition from Pending
    if (existing.status !== STATUSES.PENDING) {
      return next(createError(
        `Cannot start review from status "${existing.status}".`,
        409,
        ERROR_CODES.INVALID_TRANSITION
      ));
    }

    const { error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        status: STATUSES.UNDER_REVIEW,
        last_updated_by: req.user.userId,
      })
      .eq('application_no', applicationNo);

    if (updateError) {
      return next(createError('Failed to start review.', 500, ERROR_CODES.INTERNAL_ERROR));
    }

    return res.status(200).json(successResponse('Application is now under review.'));
  } catch (err) {
    return next(err);
  }
};

/**
 * PUT /api/bplo/applications/save-checklist/:app_no
 * Saves the current checklist progress without approving.
 * Allows BPLO officer to save work and come back later.
 */
const saveChecklistSchema = z.object({
  checklist: z.array(
    z.object({
      requirementId: z.coerce.number().int().positive(),
      status: z.enum([
        DOC_VERIFICATION_STATUS.PENDING,
        DOC_VERIFICATION_STATUS.VERIFIED,
        DOC_VERIFICATION_STATUS.YES,
        DOC_VERIFICATION_STATUS.NO,
        DOC_VERIFICATION_STATUS.RETURNED,
        DOC_VERIFICATION_STATUS.NOT_NEEDED,
        DOC_VERIFICATION_STATUS.AWAITING_ISSUANCE,
      ]),
      remarks: z.string().trim().optional().nullable(),
    })
  ).min(1, 'Checklist is required.'),
});

const saveChecklist = async (req, res, next) => {
  try {
    const { app_no: applicationNo } = req.params;
    const input = saveChecklistSchema.parse(req.body);

    for (const item of input.checklist) {
      // Skip Awaiting Issuance items — they're system-managed
      if (item.status === DOC_VERIFICATION_STATUS.AWAITING_ISSUANCE) continue;

      const { error: updateError } = await supabaseAdmin
        .from('doc_verifications')
        .update({
          status: item.status,
          remarks: item.remarks || null,
          verified_by: req.user.userId,
        })
        .eq('application_no', applicationNo)
        .eq('requirement_id', item.requirementId);

      if (updateError) {
        console.error('[bplo.controller] Failed to save checklist item:', updateError.message);
        return next(createError('Failed to save checklist progress.', 500, ERROR_CODES.INTERNAL_ERROR));
      }
    }

    return res.status(200).json(successResponse('Checklist progress saved.'));
  } catch (err) {
    return next(err);
  }
};

const reviewSchema = z.array(
  z.object({
    section: z.string(),
    status: z.enum(['Verified', 'Discrepancy']),
    remarks: z.string().trim().optional(),
  })
).min(1, 'Review sections are required.');

const reviewApplication = async (req, res, next) => {
  try {
    const { app_no: applicationNo } = req.params;
    const input = reviewSchema.parse(req.body);

    for (const item of input) {
      if (item.status === 'Discrepancy' && !item.remarks?.trim()) {
        return next(createError(
          `Remarks are required when section ${item.section} has a Discrepancy.`,
          400,
          ERROR_CODES.VALIDATION_ERROR
        ));
      }

      const { error: reviewError } = await supabaseAdmin
        .from('application_data_reviews')
        .upsert({
          application_no: applicationNo,
          section: item.section,
          status: item.status,
          remarks: item.status === 'Discrepancy' ? item.remarks.trim() : null,
          reviewed_by_user_id: req.user.userId,
        }, { onConflict: 'application_no, section' });

      if (reviewError) {
        console.error('[bplo.controller] Failed data review update:', reviewError.message);
        return next(createError(
          'Failed to update data review.',
          500,
          ERROR_CODES.INTERNAL_ERROR
        ));
      }
    }

    return res.status(200).json(
      successResponse('Data review updated successfully.')
    );
  } catch (err) {
    return next(err);
  }
};

const getApplicationDetails = async (req, res, next) => {
  try {
    const { app_no: applicationNo } = req.params;

    // 1. Fetch application basic details with full business info
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select(`
        application_no,
        status,
        submitted_at,
        type_id,
        application_types ( name ),
        businesses (
          business_name,
          trade_name,
          org_type_id,
          organization_types ( name ),
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
      .eq('application_no', applicationNo)
      .single();

    if (appError || !application) {
      return next(createError('Application not found', 404, ERROR_CODES.NOT_FOUND));
    }

    // 1b. Fetch application activities (Lines of Business)
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from('application_activities')
      .select(`
        activity_id,
        capitalization,
        gross_sales_prev_year,
        business_activities ( name )
      `)
      .eq('application_no', applicationNo);

    if (activitiesError) {
      console.warn('[bplo.controller] Failed to fetch activities:', activitiesError.message);
    }

    // 2. Fetch doc_verifications (checklist) — include file_path for document viewer
    //    file_path column may not exist if migration 018 hasn't been applied yet.
    let checklist = null;
    let checklistError = null;

    const { data: checklistData, error: checklistErr1 } = await supabaseAdmin
      .from('doc_verifications')
      .select(`
        requirement_id,
        status,
        remarks,
        file_path,
        requirement_types (
          name,
          max_files,
          condition_description
        )
      `)
      .eq('application_no', applicationNo);

    if (checklistErr1) {
      // Fallback: query without file_path (column may not exist yet)
      const { data: fallbackData, error: fallbackErr } = await supabaseAdmin
        .from('doc_verifications')
        .select(`
          requirement_id,
          status,
          remarks,
          requirement_types (
            name,
            max_files,
            condition_description
          )
        `)
        .eq('application_no', applicationNo);

      if (fallbackErr) {
        return next(createError('Failed to fetch checklist', 500, ERROR_CODES.INTERNAL_ERROR));
      }
      checklist = (fallbackData || []).map((item) => ({ ...item, file_path: null }));
    } else {
      checklist = checklistData || [];
    }

    // 3. Fetch application_data_reviews
    const { data: dataReviews, error: reviewsError } = await supabaseAdmin
      .from('application_data_reviews')
      .select('section, status, remarks')
      .eq('application_no', applicationNo);

    if (reviewsError) {
      return next(createError('Failed to fetch data reviews', 500, ERROR_CODES.INTERNAL_ERROR));
    }

    // 4. Fetch barangay clearance status if any
    const { data: brgyClearance, error: brgyError } = await supabaseAdmin
      .from('barangay_clearances')
      .select('status')
      .eq('application_no', applicationNo)
      .maybeSingle();

    if (brgyError) {
      return next(createError('Failed to fetch barangay clearance status', 500, ERROR_CODES.INTERNAL_ERROR));
    }

    // 5. Generate signed download URLs for each document that has a file_path
    const formattedChecklist = await Promise.all(
      checklist.map(async (item) => {
        let signedUrl = null;
        let fileUrls = [];
        if (item.file_path) {
          try {
            const paths = item.file_path.split(',');
            for (const p of paths) {
              const url = await generatePresignedDownloadUrl(p.trim());
              fileUrls.push(url);
            }
            if (fileUrls.length > 0) signedUrl = fileUrls[0];
          } catch (err) {
            // Non-fatal: log and continue without the URL
            console.warn(`[bplo.controller] Could not generate signed URL for ${item.file_path}:`, err.message);
          }
        }
        return {
          requirementId: item.requirement_id,
          label: item.requirement_types?.name || `Requirement ${item.requirement_id}`,
          status: item.status,
          remarks: item.remarks,
          filePath: item.file_path || null,
          fileUrl: signedUrl, // First URL for backward compatibility
          fileUrls: fileUrls, // All generated URLs for multi-file viewer
          maxFiles: item.requirement_types?.max_files || 1,
          conditionDescription: item.requirement_types?.condition_description || null,
        };
      })
    );

    return res.status(200).json(
      successResponse('Application details fetched successfully.', {
        ...application,
        activities: (activities || []).map((a) => ({
          name: a.business_activities?.name || `Activity ${a.activity_id}`,
          capitalization: a.capitalization,
          gross_sales_prev_year: a.gross_sales_prev_year,
        })),
        checklist: formattedChecklist,
        data_reviews: dataReviews || [],
        brgy_clearance: brgyClearance || null,
      })
    );
  } catch (err) {
    return next(err);
  }
};

const verifyApplication = async (req, res, next) => {
  try {
    const { app_no: applicationNo } = req.params;
    const input = verifySchema.parse(req.body);

    // Update checklist items first.
    for (const item of input.checklist) {
      if (item.status === 'Returned' && !item.remarks?.trim()) {
        return next(createError(
          `Remarks are required when requirement ${item.requirementId} is marked Returned.`,
          400,
          ERROR_CODES.VALIDATION_ERROR
        ));
      }

      const { error: checklistError } = await supabaseAdmin
        .from('doc_verifications')
        .update({
          status: item.status,
          remarks: item.status === 'Returned' ? item.remarks.trim() : null,
          verified_by: req.user.userId,
        })
        .eq('application_no', applicationNo)
        .eq('requirement_id', item.requirementId);

      if (checklistError) {
        console.error('[bplo.controller] Failed checklist update:', checklistError.message);
        return next(createError(
          'Failed to update verification checklist.',
          500,
          ERROR_CODES.INTERNAL_ERROR
        ));
      }
    }

    // Validate all checklist items are resolved (Verified or Not Needed).
    const { data: checklistRows, error: checklistFetchError } = await supabaseAdmin
      .from('doc_verifications')
      .select('status')
      .eq('application_no', applicationNo);

    if (checklistFetchError) {
      console.error('[bplo.controller] Failed to load checklist rows:', checklistFetchError.message);
      return next(createError(
        'Failed to validate verification checklist.',
        500,
        ERROR_CODES.INTERNAL_ERROR
      ));
    }

    if (!checklistRows || checklistRows.length === 0) {
      return next(createError(
        'Cannot verify application without checklist records.',
        400,
        ERROR_CODES.INVALID_TRANSITION
      ));
    }

    // Guard: All doc_verifications rows must be in a terminal-pass state.
    // Terminal-pass states: 'Verified', 'Yes', 'Not Needed'.
    // 'Awaiting Issuance' blocks verification — BPLO must wait for Barangay action.
    // 'Pending', 'Returned', 'No' also block — BPLO must resolve them first.
    const PASS_STATUSES = [
      DOC_VERIFICATION_STATUS.VERIFIED,
      DOC_VERIFICATION_STATUS.YES,
      DOC_VERIFICATION_STATUS.NOT_NEEDED,
    ];

    const hasUnresolvedItems = checklistRows.some(
      (row) => !PASS_STATUSES.includes(row.status)
    );

    if (hasUnresolvedItems) {
      return next(createError(
        'All checklist items must be Verified or Not Needed before final verification.',
        400,
        ERROR_CODES.INVALID_TRANSITION
      ));
    }

    // Guard: All application_data_reviews rows must be 'Verified'
    const { data: reviewRows, error: reviewFetchError } = await supabaseAdmin
      .from('application_data_reviews')
      .select('status')
      .eq('application_no', applicationNo);

    if (reviewFetchError) {
      console.error('[bplo.controller] Failed to load data review rows:', reviewFetchError.message);
      return next(createError(
        'Failed to validate data review.',
        500,
        ERROR_CODES.INTERNAL_ERROR
      ));
    }
    
    // We expect exactly 4 sections
    if (!reviewRows || reviewRows.length < 4) {
      return next(createError(
        'All data review sections must be completed before final verification.',
        400,
        ERROR_CODES.INVALID_TRANSITION
      ));
    }

    const hasUnresolvedReviews = reviewRows.some(
      (row) => row.status !== 'Verified'
    );

    if (hasUnresolvedReviews) {
       return next(createError(
        'All data review sections must be Verified before final verification.',
        400,
        ERROR_CODES.INVALID_TRANSITION
      ));
    }
    
    // Guard: if a barangay_clearances record exists, its status must be 'Issued'
    const { data: brgyRow, error: brgyFetchError } = await supabaseAdmin
      .from('barangay_clearances')
      .select('status')
      .eq('application_no', applicationNo)
      .maybeSingle();
      
    if (brgyFetchError) {
      console.error('[bplo.controller] Failed to load barangay_clearances row:', brgyFetchError.message);
      return next(createError(
        'Failed to validate barangay clearance.',
        500,
        ERROR_CODES.INTERNAL_ERROR
      ));
    }
    
    if (brgyRow && brgyRow.status !== 'Issued') {
       return next(createError(
        'Barangay clearance must be Issued before final verification.',
        400,
        ERROR_CODES.INVALID_TRANSITION
      ));
    }

    // Fetch current application state before transition.
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('applications')
      .select('application_no, status')
      .eq('application_no', applicationNo)
      .single();

    if (existingError || !existing) {
      return next(createError(
        'Application not found.',
        404,
        ERROR_CODES.NOT_FOUND
      ));
    }

    if (![STATUSES.PENDING, STATUSES.UNDER_REVIEW].includes(existing.status)) {
      return next(createError(
        `Application cannot be verified from status "${existing.status}".`,
        409,
        ERROR_CODES.INVALID_TRANSITION
      ));
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        status: STATUSES.VERIFIED,
        last_updated_by: req.user.userId,
        return_remarks: null,
      })
      .eq('application_no', applicationNo)
      .select('application_no, status, updated_at')
      .single();

    if (updateError) {
      console.error('[bplo.controller] Failed to transition application to Verified:', updateError.message);
      return next(createError(
        'Failed to verify application.',
        500,
        ERROR_CODES.INTERNAL_ERROR
      ));
    }

    logAction({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.APPLICATION_VERIFIED,
      entityType: 'applications',
      entityId: applicationNo,
      oldValue: { status: existing.status },
      newValue: { status: STATUSES.VERIFIED },
      ipAddress: getClientIp(req),
    });

    // Return response immediately — email is fire-and-forget below.
    res.status(200).json(
      successResponse('Application verified successfully.', updated)
    );

    // Phase 9: Wire APPLICATION_VERIFIED email trigger.
    const applicant = await _resolveApplicantForEmail(applicationNo);
    if (applicant) {
      dispatchEmail({
        triggerEvent:   EMAIL_TRIGGERS.APPLICATION_VERIFIED,
        recipientEmail: applicant.email,
        applicationNo,
        payload: {
          name:         applicant.name,
          applicationNo,
          businessName: applicant.businessName,
        },
      });
    }
  } catch (err) {
    return next(err);
  }
};

const returnApplication = async (req, res, next) => {
  try {
    const { app_no: applicationNo } = req.params;
    const input = returnSchema.parse(req.body);

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('applications')
      .select('application_no, status, return_remarks')
      .eq('application_no', applicationNo)
      .single();

    if (existingError || !existing) {
      return next(createError(
        'Application not found.',
        404,
        ERROR_CODES.NOT_FOUND
      ));
    }

    if (![STATUSES.PENDING, STATUSES.UNDER_REVIEW].includes(existing.status)) {
      return next(createError(
        `Application cannot be returned from status "${existing.status}".`,
        409,
        ERROR_CODES.INVALID_TRANSITION
      ));
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        status: STATUSES.RETURNED,
        return_remarks: input.remarks,
        last_updated_by: req.user.userId,
      })
      .eq('application_no', applicationNo)
      .select('application_no, status, return_remarks, updated_at')
      .single();

    if (updateError) {
      console.error('[bplo.controller] Failed to return application:', updateError.message);
      return next(createError(
        'Failed to return application.',
        500,
        ERROR_CODES.INTERNAL_ERROR
      ));
    }

    logAction({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.APPLICATION_RETURNED,
      entityType: 'applications',
      entityId: applicationNo,
      oldValue: { status: existing.status, returnRemarks: existing.return_remarks },
      newValue: { status: STATUSES.RETURNED, returnRemarks: input.remarks },
      ipAddress: getClientIp(req),
    });

    // Return response immediately — email is fire-and-forget below.
    res.status(200).json(
      successResponse('Application returned successfully.', updated)
    );

    // Phase 9: Wire APPLICATION_RETURNED email trigger.
    const applicant = await _resolveApplicantForEmail(applicationNo);
    if (applicant) {
      dispatchEmail({
        triggerEvent:   EMAIL_TRIGGERS.APPLICATION_RETURNED,
        recipientEmail: applicant.email,
        applicationNo,
        payload: {
          name:         applicant.name,
          applicationNo,
          businessName: applicant.businessName,
          remarks:      input.remarks,
        },
      });
    }
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/bplo/applications/:app_no/document/:requirement_id
 * Generates a fresh signed download URL for a specific document.
 * Used when the BPLO officer clicks a checklist item to view the document.
 */
const getDocumentUrl = async (req, res, next) => {
  try {
    const { app_no: applicationNo, requirement_id: requirementId } = req.params;

    // Try to select file_path — may not exist if migration 018 hasn't been applied
    let filePath = null;

    const { data: docRow, error: docError } = await supabaseAdmin
      .from('doc_verifications')
      .select('file_path')
      .eq('application_no', applicationNo)
      .eq('requirement_id', parseInt(requirementId, 10))
      .single();

    if (docError) {
      // file_path column might not exist — try without it to confirm the row exists
      const { data: fallbackRow, error: fallbackErr } = await supabaseAdmin
        .from('doc_verifications')
        .select('requirement_id')
        .eq('application_no', applicationNo)
        .eq('requirement_id', parseInt(requirementId, 10))
        .single();

      if (fallbackErr || !fallbackRow) {
        return next(createError('Document record not found.', 404, ERROR_CODES.NOT_FOUND));
      }
      // Row exists but no file_path column
      return res.status(200).json(
        successResponse('No document uploaded for this requirement.', { fileUrl: null })
      );
    }

    if (!docRow || !docRow.file_path) {
      return res.status(200).json(
        successResponse('No document uploaded for this requirement.', { fileUrl: null })
      );
    }

    filePath = docRow.file_path;
    const paths = filePath.split(',');
    const fileUrls = [];
    for (const p of paths) {
      fileUrls.push(await generatePresignedDownloadUrl(p.trim()));
    }

    return res.status(200).json(
      successResponse('Document URL generated successfully.', { 
        fileUrl: fileUrls[0] || null,
        fileUrls: fileUrls
      })
    );
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getPendingApplications,
  startReview,
  saveChecklist,
  getApplicationDetails,
  getDocumentUrl,
  reviewApplication,
  verifyApplication,
  returnApplication,
};
