const { supabaseAdmin } = require('../config/supabase');
const storageService = require('./storage.service');
const { createError } = require('../middlewares/error.middleware');
const { ERROR_CODES, CORRECTION_STATUS, CORRECTABLE_FIELDS } = require('../utils/constants');
const { CorrectionRequestSchema } = require('../utils/validators');

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

module.exports = {
  submitCorrectionRequest,
  getUploadUrl,
  listMyCorrectionRequests
};
