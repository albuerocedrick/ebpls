const { supabaseAdmin } = require('../config/supabase');
const { createError } = require('../middlewares/error.middleware');
const { computeAssessment } = require('../utils/assessment-engine');
const { isIP } = require('node:net');

function assessmentError(error) {
  if (error.code === '42501') return createError('Your role cannot perform this assessment operation.', 403);
  if (error.code === 'P0002') return createError('Application or assessment not found.', 404);
  if (error.code === '40001') return createError('Application or fee configuration changed. Refresh and approve again.', 409);
  if (error.code === '22023') return createError(error.message, 409);
  console.error('[assessment.service]', error.message);
  return createError('Unable to save assessment. No partial assessment was committed.', 500);
}

async function calculateFees(applicationNo) {
  const { data, error } = await supabaseAdmin.rpc('get_assessment_inputs', { p_application_no: applicationNo });
  if (error) throw assessmentError(error);
  return computeAssessment(data);
}

async function createAssessment(applicationNo, officerId, calculatedData, ipAddress = null) {
  const { data, error } = await supabaseAdmin.rpc('approve_and_assess_application', {
    p_application_no: applicationNo, p_officer_id: officerId,
    p_calculation: calculatedData, p_ip_address: isIP(ipAddress || '') ? ipAddress : null,
  });
  if (error) throw assessmentError(error);
  return data;
}

async function updateBmbeExemption(applicationNo, officerId, payload) {
  if (payload.enabled) {
    if (!payload.certificate_path.startsWith(`${officerId}/`) || payload.certificate_path.includes('..') || payload.certificate_path.includes(',')) throw createError('Upload the certificate using your Treasury account.', 400);
    const { data, error } = await supabaseAdmin.storage.from('documents').info(payload.certificate_path);
    if (error || !data || !data.size || data.size > 5 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(data.contentType)) throw createError('Upload a valid DTI BMBE certificate (PDF, JPG or PNG, up to 5 MB).', 400);
  }
  const { data, error } = await supabaseAdmin.rpc('set_assessment_bmbe_exemption', {
    p_application_no: applicationNo, p_officer_id: officerId,
    p_enabled: payload.enabled, p_certificate_path: payload.certificate_path || null,
    p_authority_reference: payload.authority_reference || null, p_remarks: payload.remarks,
  });
  if (error) throw assessmentError(error);
  return data;
}

async function finalizeAssessment(applicationNo, officerId) {
  const { data, error } = await supabaseAdmin.rpc('finalize_automatic_assessment', { p_application_no: applicationNo, p_officer_id: officerId });
  if (error) throw assessmentError(error);
  return data;
}

module.exports = { calculateFees, createAssessment, updateBmbeExemption, finalizeAssessment };
