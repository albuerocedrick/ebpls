const { supabaseAdmin } = require('../config/supabase');
const storageService = require('./storage.service');
const auditService = require('./audit.service');
const { createError } = require('../middlewares/error.middleware');
const { ERROR_CODES, CORRECTION_STATUS, CORRECTABLE_FIELDS, STATUSES, EMAIL_TRIGGERS } = require('../utils/constants');
const { CorrectionRequestSchema } = require('../utils/validators');
const emailService = require('./email.service');

// Locked post-review statuses where corrections are allowed
const CORRECTION_ELIGIBLE_STATUSES = [
  'Verified', 'For Assessment', 'Assessed', 'For Payment', 
  'PaymentProcessing', 'Paid', 'Completed'
];

/**
 * Validates ownership and gets the application along with business/taxpayer data
 */
const getApplicationAndVerifyOwnership = async (applicationNo, userId) => {
  const { data: appData, error: appError } = await supabaseAdmin
    .from('applications')
    .select(`
      application_no, 
      status,
      businesses (
        taxpayer_id,
        business_name,
        trade_name,
        address_line1,
        barangay,
        latitude,
        longitude,
        taxpayers!inner (
          user_id,
          first_name,
          middle_name,
          last_name,
          contact_no
        )
      )
    `)
    .eq('application_no', applicationNo)
    .single();

  if (appError || !appData) {
    throw createError('Application not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  // Check ownership
  const appUserId = appData.businesses?.taxpayers?.user_id;
  if (appUserId !== userId) {
    throw createError('You do not have permission to modify this application.', 403, ERROR_CODES.FORBIDDEN);
  }

  return appData;
};

/**
 * Submits a new correction request
 */
const submitCorrectionRequest = async (userId, payload) => {
  // 1. Validate payload
  const validatedData = CorrectionRequestSchema.parse(payload);
  const { application_no, field_name, new_value, proof_file_path } = validatedData;

  // 2. Fetch application and confirm ownership
  const appData = await getApplicationAndVerifyOwnership(application_no, userId);

  // 3. Confirm application status is eligible
  if (!CORRECTION_ELIGIBLE_STATUSES.includes(appData.status)) {
    throw createError(
      `Correction requests cannot be submitted when application status is '${appData.status}'.`, 
      400, 
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // 4. Fetch current value of field_name to populate old_value
  let old_value = '';
  const businessData = appData.businesses;
  const taxpayerData = businessData?.taxpayers;
  
  if (['first_name', 'middle_name', 'last_name', 'contact_no'].includes(field_name)) {
    old_value = taxpayerData?.[field_name] || '';
  } else {
    // business_name, trade_name, address_line1, barangay, latitude, longitude
    old_value = businessData?.[field_name] || '';
  }

  // Handle nulls by converting to empty string for TEXT column
  if (old_value === null || old_value === undefined) old_value = '';
  
  // Cast number to string if needed
  old_value = old_value.toString();

  // 5. Insert into correction_requests
  const { data: insertData, error: insertError } = await supabaseAdmin
    .from('correction_requests')
    .insert([{
      application_no,
      requested_by: userId,
      field_name,
      old_value,
      new_value,
      status: CORRECTION_STATUS.PENDING
    }])
    .select()
    .single();

  if (insertError) {
    console.error('[correction.service] Failed to insert correction request:', insertError.message);
    throw createError('Failed to submit correction request.', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  // 6. Insert proof document if provided
  if (proof_file_path) {
    const { error: docError } = await supabaseAdmin
      .from('correction_request_documents')
      .insert([{
        correction_request_id: insertData.id,
        file_path: proof_file_path
      }]);
      
    if (docError) {
      console.warn('[correction.service] Failed to insert proof document reference, but request created:', docError.message);
    }
  }

  return insertData;
};

/**
 * Gets a pre-signed URL for uploading a proof document
 */
const getUploadUrl = async (userId, correctionRequestId, fileName) => {
  // Wait, the client generates upload URL BEFORE submitting the correction request?
  // Usually, yes. In UAF it's done via taxpayer_id namespace.
  // The design says: "POST /api/corrections/upload — Applicant requests a pre-signed upload URL for proof document (auth: Applicant)"
  // But they don't have the correctionRequestId yet if they upload before submit.
  // Let's namespace it by userId/corrections/timestamp_filename
  
  // Reuse storageService.generatePresignedUploadUrl which uses taxpayerId/timestamp_fileName
  // We just need the taxpayer_id of the user.
  const { data: taxpayerData, error: taxpayerError } = await supabaseAdmin
    .from('taxpayers')
    .select('taxpayer_id')
    .eq('user_id', userId)
    .single();
    
  if (taxpayerError || !taxpayerData) {
    throw createError('Taxpayer record not found.', 404, ERROR_CODES.NOT_FOUND);
  }
  
  // Prepend "corrections/" to the file name to organize it
  return await storageService.generatePresignedUploadUrl(
    taxpayerData.taxpayer_id, 
    `corrections/${fileName}`
  );
};

/**
 * Lists the applicant's own correction requests
 */
const listMyCorrectionRequests = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('correction_requests')
    .select(`
      *,
      correction_request_documents (file_path)
    `)
    .eq('requested_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[correction.service] Failed to list correction requests:', error.message);
    throw createError('Failed to fetch correction requests.', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  return data;
};

/**
 * Lists all pending correction requests for BPLO
 */
const listPendingCorrectionRequests = async () => {
  const { data, error } = await supabaseAdmin
    .from('correction_requests')
    .select(`
      id,
      application_no,
      field_name,
      old_value,
      new_value,
      status,
      created_at,
      applications (
        status,
        businesses (
          business_name
        )
      )
    `)
    .eq('status', CORRECTION_STATUS.PENDING)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[correction.service] Failed to list pending correction requests:', error.message);
    throw createError('Failed to fetch pending requests.', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  // Flatten the nested data structure for the client
  return data.map(req => ({
    ...req,
    business_name: req.applications?.businesses?.business_name,
    application_status: req.applications?.status
  }));
};

/**
 * Gets the detail of a single correction request including proof documents
 */
const getCorrectionRequestDetail = async (id) => {
  const { data, error } = await supabaseAdmin
    .from('correction_requests')
    .select(`
      *,
      correction_request_documents (file_path)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    throw createError('Correction request not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  // Generate signed URLs for all documents
  const docs = data.correction_request_documents || [];
  const signedDocs = await Promise.all(docs.map(async (doc) => {
    try {
      const url = await storageService.generatePresignedDownloadUrl(doc.file_path, 900); // 15 mins
      return { file_path: doc.file_path, signedUrl: url };
    } catch (err) {
      console.warn('[correction.service] Failed to generate signed URL for document:', doc.file_path);
      return { file_path: doc.file_path, signedUrl: null };
    }
  }));

  return {
    ...data,
    documents: signedDocs
  };
};

/**
 * Approves a correction request
 */
const approveCorrectionRequest = async (id, bploUserId, ipAddress = null) => {
  // 1. Fetch request to ensure it's pending and get application_no
  const { data: request, error: reqError } = await supabaseAdmin
    .from('correction_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (reqError || !request) {
    throw createError('Correction request not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (request.status !== CORRECTION_STATUS.PENDING) {
    throw createError(`Cannot approve a request that is already ${request.status}.`, 409, ERROR_CODES.CONFLICT);
  }

  // 2. Determine target table and field
  const { field_name, new_value, old_value, application_no } = request;
  const isTaxpayerField = ['first_name', 'middle_name', 'last_name', 'contact_no'].includes(field_name);
  
  // We need the business_id or taxpayer_id depending on what we update
  const appData = await getApplicationAndVerifyOwnership(application_no, request.requested_by);
  const applicantName = appData.businesses?.taxpayers ? `${appData.businesses.taxpayers.first_name} ${appData.businesses.taxpayers.last_name}` : 'Applicant';
  const applicantEmail = appData.businesses?.taxpayers?.user_id ? (await supabaseAdmin.from('users').select('email').eq('user_id', appData.businesses.taxpayers.user_id).single()).data?.email : null;
  
  // 3. Update the target table
  if (isTaxpayerField) {
    const taxpayerId = appData.businesses?.taxpayer_id;
    const { error: updateError } = await supabaseAdmin
      .from('taxpayers')
      .update({ [field_name]: new_value })
      .eq('taxpayer_id', taxpayerId);
      
    if (updateError) {
      console.error('[correction.service] Failed to update taxpayer table:', updateError.message);
      throw createError('Failed to apply correction to database.', 500, ERROR_CODES.INTERNAL_ERROR);
    }
  } else {
    // Determine business_id from applications table
    const { data: appDbData } = await supabaseAdmin
      .from('applications')
      .select('business_id')
      .eq('application_no', application_no)
      .single();
      
    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({ [field_name]: new_value })
      .eq('business_id', appDbData.business_id);
      
    if (updateError) {
      console.error('[correction.service] Failed to update businesses table:', updateError.message);
      throw createError('Failed to apply correction to database.', 500, ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 4. Update the correction_request status
  const { data: updatedRequest, error: statusError } = await supabaseAdmin
    .from('correction_requests')
    .update({
      status: CORRECTION_STATUS.APPROVED,
      reviewed_by: bploUserId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (statusError) {
    // Edge case: target table updated but status failed to update
    console.error('[correction.service] CRITICAL: Failed to update correction_request status after applying changes:', statusError.message);
  }

  // 4b. Invalidate Permit if application is Completed
  if (appData.status === STATUSES.COMPLETED) {
    // Delete the permit so it gets regenerated next time it is requested or via a trigger
    const { error: permitError } = await supabaseAdmin
      .from('permits')
      .delete()
      .eq('application_no', application_no);
      
    if (permitError) {
      console.error('[correction.service] Failed to invalidate permit after correction:', permitError.message);
    } else {
      // Regenerate the permit and send PERMIT_READY email with updated PDFs
      if (applicantEmail) {
        emailService.dispatchEmail({
          triggerEvent: EMAIL_TRIGGERS.PERMIT_READY,
          recipientEmail: applicantEmail,
          applicationNo: application_no,
          payload: {
            name: applicantName,
            applicationNo: application_no,
            businessName: appData.businesses?.business_name || 'Business'
          }
        });
      }
    }
  }

  // 5. Log audit event
  await auditService.logAction({
    userId: bploUserId,
    action: auditService.AUDIT_ACTIONS.CORRECTION_APPROVED,
    entityType: 'correction_requests',
    entityId: id,
    oldValue: { [field_name]: old_value },
    newValue: { [field_name]: new_value },
    ipAddress
  });

  // 6. Send Approval Email
  if (applicantEmail) {
    emailService.dispatchEmail({
      triggerEvent: EMAIL_TRIGGERS.CORRECTION_APPROVED,
      recipientEmail: applicantEmail,
      applicationNo: application_no,
      payload: {
        name: applicantName,
        applicationNo: application_no,
        fieldName: field_name.replace(/_/g, ' ')
      }
    });
  }

  return updatedRequest;
};

/**
 * Rejects a correction request
 */
const rejectCorrectionRequest = async (id, bploUserId, remarks, ipAddress = null) => {
  // 1. Validate remarks
  if (!remarks || remarks.trim() === '') {
    throw createError('Remarks are required for rejection.', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  // 2. Fetch request
  const { data: request, error: reqError } = await supabaseAdmin
    .from('correction_requests')
    .select('status, field_name, application_no, requested_by')
    .eq('id', id)
    .single();

  if (reqError || !request) {
    throw createError('Correction request not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (request.status !== CORRECTION_STATUS.PENDING) {
    throw createError(`Cannot reject a request that is already ${request.status}.`, 409, ERROR_CODES.CONFLICT);
  }

  // 3. Update status
  const { data: updatedRequest, error: statusError } = await supabaseAdmin
    .from('correction_requests')
    .update({
      status: CORRECTION_STATUS.REJECTED,
      reviewed_by: bploUserId,
      remarks: remarks.trim(),
      reviewed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (statusError) {
    console.error('[correction.service] Failed to update correction_request status to rejected:', statusError.message);
    throw createError('Failed to reject correction request.', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  // 4. Log audit event
  await auditService.logAction({
    userId: bploUserId,
    action: auditService.AUDIT_ACTIONS.CORRECTION_REJECTED,
    entityType: 'correction_requests',
    entityId: id,
    newValue: { remarks: remarks.trim() },
    ipAddress
  });

  // 5. Send Rejection Email
  const appData = await getApplicationAndVerifyOwnership(request.application_no, request.requested_by);
  const applicantName = appData.businesses?.taxpayers ? `${appData.businesses.taxpayers.first_name} ${appData.businesses.taxpayers.last_name}` : 'Applicant';
  const applicantEmailData = await supabaseAdmin.from('users').select('email').eq('user_id', request.requested_by).single();
  const applicantEmail = applicantEmailData.data?.email;

  if (applicantEmail) {
    emailService.dispatchEmail({
      triggerEvent: EMAIL_TRIGGERS.CORRECTION_REJECTED,
      recipientEmail: applicantEmail,
      applicationNo: request.application_no,
      payload: {
        name: applicantName,
        applicationNo: request.application_no,
        fieldName: request.field_name.replace(/_/g, ' '),
        remarks: remarks.trim()
      }
    });
  }

  return updatedRequest;
};

module.exports = {
  submitCorrectionRequest,
  getUploadUrl,
  listMyCorrectionRequests,
  listPendingCorrectionRequests,
  getCorrectionRequestDetail,
  approveCorrectionRequest,
  rejectCorrectionRequest
};
