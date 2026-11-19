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
  // Anti-Duplicate Guardrail (Revision 13 & Zero Duplicate BIN Policy):
  // Block submission of New Application (type_id = 1) if business name or DTI registration is already registered under this taxpayer
  if (payload.type_id === 1) {
    let query = supabaseAdmin
      .from('businesses')
      .select('business_id, bin, business_name, dti_sec_cda_reg_no')
      .eq('taxpayer_id', taxpayerId)
      .eq('is_retired', false);

    if (typeof query.ilike === 'function') {
      if (payload.dti_sec_cda_reg_no && payload.dti_sec_cda_reg_no.trim() !== '') {
        query = query.or(`dti_sec_cda_reg_no.eq.${payload.dti_sec_cda_reg_no.trim()},business_name.ilike.${payload.business_name.trim()}`);
      } else {
        query = query.ilike('business_name', payload.business_name.trim());
      }
    } else {
      query = query.eq('business_name', payload.business_name);
    }
    if (typeof query.limit === 'function') {
      query = query.limit(1);
    }
    const { data: existingBiz } = await query.maybeSingle();
    if (existingBiz) {
      throw createError(
        `A registered business named "${existingBiz.business_name}" is already active under your account (BIN: ${existingBiz.bin || 'Assigned'}). Under Liliw LGU ordinance and Zero Duplicate BIN Policy, do not file a New Application for an existing establishment. Please file a "Business Amendment" or "Annual Renewal" instead.`,
        400
      );
    }
  }

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

/** Submit a selective multi-branch renewal without creating duplicate business records */
async function submitRenewalApplication(taxpayerId, payload) {
  const { data: biz, error: bizError } = await supabaseAdmin.from('businesses')
    .select('business_id, bin, org_type_id, is_retired')
    .eq('business_id', payload.business_id)
    .eq('taxpayer_id', taxpayerId)
    .maybeSingle();

  if (bizError) throw createError('Unable to load business details.', 500);
  if (!biz) throw createError('Business not found or access denied.', 404);
  if (biz.is_retired) throw createError('Cannot renew a retired business.', 400);

  const resolvedActivities = new Map();
  const branches = [];
  for (const branch of payload.branches) {
    const activities = await resolveActivities(branch.activities, resolvedActivities);
    branches.push({ ...branch, activities });
  }

  const requirements = await resolveBranchRequirements({
    type_id: 2,
    org_type_id: biz.org_type_id,
    branches: branches.map(branch => ({
      branch_key: branch.branch_key || branch.branch_id || 'main',
      tenancy_type: branch.tenancy_type,
      activity_names: branch.activities.map(activity => activity.name),
    })),
  });

  for (const branch of branches) {
    const key = branch.branch_key || branch.branch_id || 'main';
    if (!requirements.some(r => (r.branch_key === key || r.branch_key === branch.branch_key) && r.name === 'Barangay Business Clearance')) {
      throw createError('Barangay Business Clearance is not configured. Please contact the administrator.', 500);
    }
  }

  const documents = await validateDocuments(taxpayerId, payload.documents || [], requirements);

  const { data: appNo, error } = await supabaseAdmin.rpc('submit_renewal_application', {
    p_taxpayer_id: taxpayerId,
    p_payload: {
      ...payload,
      org_type_id: biz.org_type_id,
      branches,
      documents,
    },
  });

  if (error) {
    if (error.code === 'P0002') throw createError('Business not found or access denied.', 404);
    if (error.code === '22023') throw createError(error.message, 400);
    console.error('[submitRenewalApplication]', error.message);
    throw createError('Unable to submit the renewal application.', 500);
  }

  return appNo;
}

/** Submit an address amendment (relocation within Liliw) linked to existing BIN */
async function submitAddressAmendment(taxpayerId, payload) {
  const { data: biz, error: bizError } = await supabaseAdmin.from('businesses')
    .select('business_id, bin, business_name, org_type_id, is_retired')
    .eq('business_id', payload.business_id)
    .eq('taxpayer_id', taxpayerId)
    .maybeSingle();

  if (bizError) throw createError('Unable to load business details.', 500);
  if (!biz) throw createError('Business not found or access denied.', 404);
  if (biz.is_retired) throw createError('Cannot amend address for a retired business.', 400);

  const { data: branch, error: branchError } = await supabaseAdmin.from('business_branches')
    .select('branch_id, branch_key, branch_name, address_line1, barangay, tenancy_type, is_active')
    .eq('branch_id', payload.branch_id)
    .eq('business_id', biz.business_id)
    .maybeSingle();

  if (branchError) throw createError('Unable to load branch details.', 500);
  if (!branch) throw createError('Branch not found under this business.', 404);
  if (!branch.is_active) throw createError('Cannot relocate an inactive branch.', 400);

  const { data: barangay, error: bgyError } = await supabaseAdmin.from('barangays')
    .select('id, name, latitude, longitude, zone_id')
    .eq('name', payload.new_barangay)
    .eq('is_active', true)
    .maybeSingle();

  if (bgyError) throw createError('Unable to verify barangay.', 500);
  if (!barangay) throw createError('Select an active Liliw barangay.', 400);

  // Validate uploaded files
  for (const doc of (payload.documents || [])) {
    if (!doc.file_path.startsWith(`${taxpayerId}/`) || doc.file_path.includes('..') || doc.file_path.includes(',') || !/\.(pdf|jpe?g|png)$/i.test(doc.file_path)) {
      throw createError('Invalid document path. Upload your own PDF, JPG, or PNG document.', 400);
    }
  }

  const { data: appNo, error } = await supabaseAdmin.rpc('submit_address_amendment', {
    p_taxpayer_id: taxpayerId,
    p_payload: {
      ...payload,
      new_zone_id: barangay.zone_id,
      new_latitude: barangay.latitude,
      new_longitude: barangay.longitude,
    },
  });

  if (error) {
    if (error.code === 'P0002') throw createError('Business or branch not found.', 404);
    if (error.code === '22023') throw createError(error.message, 400);
    console.error('[submitAddressAmendment]', error.message);
    throw createError('Unable to submit the address amendment.', 500);
  }

  return appNo;
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
    let activityName = activity.name;
    if (!activityName && activity.activity_id) {
      const { data, error } = await supabaseAdmin.from('business_activities').select('name')
        .eq('id', activity.activity_id).eq('is_active', true).maybeSingle();
      if (error || !data) throw createError(`Select an active business activity: ID ${activity.activity_id}.`, 400);
      activityName = data.name;
    }
    if (activityName && retiredActivity(activityName)) throw createError('Choose a defined business activity to replace Other Services.', 400);
    if (!ids.has(activityName)) {
      const { data, error } = await supabaseAdmin.from('business_activities').select('id')
        .eq('name', activityName).eq('is_active', true).maybeSingle();
      if (error) throw createError('Unable to validate business activities.', 500);
      if (!data) throw createError(`Select an active business activity: ${activityName}.`, 400);
      ids.set(activityName, data.id);
    }
    const activityId = ids.get(activityName);
    if (activities.some(a => a.activity_id === activityId)) throw createError('Declare each business activity only once per branch.', 400);
    activities.push({ ...activity, name: activityName, activity_id: activityId });
  }
  return activities;
}

module.exports = { submitApplicantApplication, submitRenewalApplication, submitAddressAmendment };
