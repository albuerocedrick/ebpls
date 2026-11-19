const { supabaseAdmin } = require('../config/supabase');
const { resolveApplicableRequirements, resolveBranchRequirements } = require('./requirement.service');
const { createError } = require('../middlewares/error.middleware');

const requirementKey = ({ requirement_id, branch_key }) => `${branch_key ?? ''}:${requirement_id}`;
const retiredActivity = name => name.trim().toLowerCase() === 'other services';

async function saveApplication(taxpayerId, payload) {
  const { data: appNo, error } = await supabaseAdmin.rpc('submit_applicant_application', {
    p_taxpayer_id: taxpayerId, p_payload: payload,
  });
  if (!error) return appNo;
  if (error.code === 'P0002') throw createError('Application not found.', 404);
  if (error.code === '22023') throw createError('Submit a draft or returned application with active barangays and zones.', 400);
  console.error('[submitApplicantApplication]', error.message);
  throw createError('Unable to submit the application. Your draft has been retained.', 500);
}

/** Validate every requirement before the atomic submission RPC writes anything. */
async function submitApplicantApplication(taxpayerId, payload) {
  if (payload.branches) {
    const requirements = await resolveBranchRequirements({ ...payload, branches: payload.branches.map(branch => ({
      ...branch, activity_names: branch.activities.map(activity => activity.name),
    })) });
    for (const branch of payload.branches) {
      if (!requirements.some(r => r.branch_key === branch.branch_key && r.name === 'Barangay Business Clearance')) {
        throw createError('Barangay Business Clearance is not configured. Please contact the administrator.', 500);
      }
    }
    const documents = await validateDocuments(taxpayerId, payload.documents, requirements);
    const resolvedActivities = new Map();
    const branches = [];
    for (const branch of payload.branches) {
      const activities = await resolveActivities(branch.activities, resolvedActivities);
      branches.push({ ...branch, activities });
    }
    return saveApplication(taxpayerId, { ...payload, branches, documents });
  }
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
  const documents = await validateDocuments(taxpayerId, payload.documents, requirements);
  const activities = await resolveActivities(payload.activities);
  return saveApplication(taxpayerId, { ...payload, activities, documents, city: 'Liliw', province: 'Laguna',
    latitude: barangay.latitude, longitude: barangay.longitude, is_renting: payload.tenancy_type === 'Rented',
    request_barangay_clearance: false });
}

async function validateDocuments(taxpayerId, submitted, requirements) {
  const applicableIds = new Set(requirements.map(r => requirementKey({ ...r, requirement_id: r.id })));
  const documents = submitted.filter(d => applicableIds.has(requirementKey(d)));
  for (const requirement of requirements) {
    const key = requirementKey({ ...requirement, requirement_id: requirement.id });
    const files = documents.filter(d => requirementKey(d) === key);
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
  return documents;
}

async function resolveActivities(declaredActivities, ids = new Map()) {
  const activities = [];
  for (const activity of declaredActivities) {
    if (retiredActivity(activity.name)) throw createError('Choose a defined business activity to replace Other Services.', 400);
    if (!ids.has(activity.name)) {
      const { data, error } = await supabaseAdmin.from('business_activities').select('id')
        .eq('name', activity.name).eq('is_active', true).maybeSingle();
      if (error) throw createError('Unable to validate business activities.', 500);
      if (!data) throw createError(`Select an active business activity: ${activity.name}.`, 400);
      ids.set(activity.name, data.id);
    }
    const activityId = ids.get(activity.name);
    if (activities.some(a => a.activity_id === activityId)) throw createError('Declare each business activity only once per branch.', 400);
    activities.push({ ...activity, activity_id: activityId });
  }
  return activities;
}

module.exports = { submitApplicantApplication };
