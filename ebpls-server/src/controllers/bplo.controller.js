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

const verifySchema = z.object({
  checklist: z.array(
    z.object({
      requirementId: z.number().int().positive(),
      // Allow all valid doc_verifications status values.
      // BPLO cannot set 'Awaiting Issuance' directly — that is set by the UAF hook.
      status: z.enum([
        DOC_VERIFICATION_STATUS.PENDING,
        DOC_VERIFICATION_STATUS.VERIFIED,
        DOC_VERIFICATION_STATUS.YES,
        DOC_VERIFICATION_STATUS.NO,
        DOC_VERIFICATION_STATUS.RETURNED,
        DOC_VERIFICATION_STATUS.NOT_NEEDED,
      ]),
      remarks: z.string().trim().optional(),
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

    return res.status(200).json(
      successResponse('Application verified successfully.', updated)
    );
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

    return res.status(200).json(
      successResponse('Application returned successfully.', updated)
    );
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getPendingApplications,
  verifyApplication,
  returnApplication,
};
