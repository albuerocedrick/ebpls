const { supabaseAdmin } = require('../config/supabase');
const { resolveApplicableRequirements } = require('./requirement.service');
const { createError } = require('../middlewares/error.middleware');

/** Validate every requirement before the atomic submission RPC writes anything. */
async function submitApplicantApplication(taxpayerId, payload) {
  const { data: barangay, error: barangayError } = await supabaseAdmin.from('barangays')
    .select('id, name, latitude, longitude').eq('name', payload.barangay).eq('is_active', true).maybeSingle();
  if (barangayError) throw createError('Unable to load the selected barangay.', 500);
  if (!barangay) throw createError('Select an active Liliw barangay.', 400);

  const requirements = await resolveApplicableRequirements({
    application_type_id: payload.type_id, org_type_id: payload.org_type_id,
    activity_names: payload.activities.map(a => a.name), tenancy_type: payload.tenancy_type,
    is_renting: payload.tenancy_type === 'Rented',
  });
  if (!requirements.some(r => r.name === 'Barangay Business Clearance')) {
    throw createError('Barangay Business Clearance is not configured. Please contact the administrator.', 500);
  }
  const applicableIds = new Set(requirements.map(r => r.id));
  const documents = payload.documents.filter(d => applicableIds.has(d.requirement_id));
  for (const requirement of requirements) {
    const files = documents.filter(d => d.requirement_id === requirement.id);
    const minimum = requirement.name === 'Valid Government ID' ? 2 : 1;
    if (files.length < minimum || files.length > requirement.max_files) {
      throw createError(`Please upload ${minimum === 2 ? 'both sides of ' : ''}${requirement.name} (maximum ${requirement.max_files} files).`, 400);
    }
  }
  const paths = new Set();
  for (const document of documents) {
    if (!document.file_path.startsWith(`${taxpayerId}/`) || document.file_path.includes('..') || document.file_path.includes(',') || !/\.(pdf|jpe?g|png)$/i.test(document.file_path)) {
      throw createError('Invalid document path. Upload your own PDF, JPG, or PNG document.', 400);
    }
    if (paths.has(document.file_path)) throw createError('Upload a separate file for each document entry.', 400);
    paths.add(document.file_path);
    const { data: file, error } = await supabaseAdmin.storage.from('documents').info(document.file_path);
    if (error || !file || !file.size || file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.contentType)) {
      throw createError('A required upload is missing or invalid. Use PDF, JPG, or PNG up to 5 MB.', 400);
    }
  }
  const activities = [];
  for (const activity of payload.activities) {
    const { data, error } = await supabaseAdmin.from('business_activities').select('id')
      .eq('name', activity.name).eq('is_active', true).maybeSingle();
    if (error) throw createError('Unable to validate business activities.', 500);
    if (!data) throw createError(`Select an active business activity: ${activity.name}.`, 400);
    if (activities.some(a => a.activity_id === data.id)) throw createError('Declare each business activity only once.', 400);
    activities.push({ ...activity, activity_id: data.id });
  }
  const { data: appNo, error } = await supabaseAdmin.rpc('submit_applicant_application', {
    p_taxpayer_id: taxpayerId,
    p_payload: { ...payload, activities, documents, city: 'Liliw', province: 'Laguna',
      latitude: barangay.latitude, longitude: barangay.longitude, is_renting: payload.tenancy_type === 'Rented',
      request_barangay_clearance: false },
  });
  if (error) {
    if (error.code === 'P0002') throw createError('Application not found.', 404);
    if (error.code === '22023') throw createError('Only draft or returned applications with an active barangay can be submitted.', 400);
    console.error('[submitApplicantApplication]', error.message);
    throw createError('Unable to submit the application. Your draft has been retained.', 500);
  }
  return appNo;
}

module.exports = { submitApplicantApplication };
