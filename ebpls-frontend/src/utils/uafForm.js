export const TENANCY_TYPES = ['Rented', 'Owned Commercial', 'Owned Residential'];
export const MAX_BRANCHES = 10;

export function getFormBranches(form) {
  return form.step2.branches?.length ? form.step2.branches : [{
    ...form.step2,
    branch_key: 'main',
    branch_name: 'Main branch',
    ...form.step3,
  }];
}

export function documentFiles(documents, requirement) {
  const matching = documents.filter(doc => Number(doc.requirement_id) === requirement.id);
  const doc = matching.find(doc => doc.branch_key === requirement.branch_key)
    ?? (requirement.branch_key == null || requirement.branch_key === 'main' ? matching.find(doc => doc.branch_key === undefined) : null);
  return (doc?.files ?? (doc ? [doc] : [])).filter(file => file?.file_path);
}

export const requirementKey = requirement => `${requirement.branch_key ?? ''}:${requirement.id}`;

export const initialFormState = {
  step1: { type_id: '', business_name: '', trade_name: '', org_type_id: '', dti_sec_cda_reg_no: '', is_franchise: false, franchisor_name: '' },
  step2: { address_line1: '', barangay: '', city: 'Liliw', province: 'Laguna', latitude: null, longitude: null, tenancy_type: 'Owned Commercial', is_renting: false, location_mismatch: false },
  step3: { lineOfBusinesses: [], stall_unit_numbers: [] },
  step4: { request_barangay_clearance: false, documents: [] },
  step5: { attestation_agreed: false },
};

export function normalizeDraftFormData(saved = {}) {
  const form = Object.fromEntries(Object.entries(initialFormState).map(([step, defaults]) => [step, { ...structuredClone(defaults), ...saved[step] }]));
  form.step2.tenancy_type = TENANCY_TYPES.includes(form.step2.tenancy_type) && saved.step2?.tenancy_type
    ? form.step2.tenancy_type : saved.step2?.is_renting ? 'Rented' : 'Owned Commercial';
  form.step2.is_renting = form.step2.tenancy_type === 'Rented';
  form.step2.city = 'Liliw';
  form.step2.province = 'Laguna';
  form.step2.location_mismatch = false;
  form.step3.stall_unit_numbers = Array.isArray(form.step3.stall_unit_numbers) ? form.step3.stall_unit_numbers : [];
  form.step4.request_barangay_clearance = false;
  // Returned-app responses and older drafts may contain several rows per ID.
  const documents = new Map();
  for (const document of form.step4.documents || []) {
    const id = Number(document.requirement_id);
    const key = `${document.branch_key ?? ''}:${id}`;
    const group = documents.get(key) || { requirement_id: id, branch_key: document.branch_key, files: [] };
    group.files.push(...(document.files || [document]).filter(file => file?.file_path).map(file => ({ ...file, url: undefined })));
    documents.set(key, group);
  }
  form.step4.documents = [...documents.values()];
  return form;
}

export function validateWizardStep(step, form, requirements = [], metrics = {}, barangays = []) {
  const errors = [];
  if (step === 1) {
    const s = form.step1;
    if (!s.type_id) errors.push('Application Type is required.');
    if (!s.org_type_id) errors.push('Organization Type is required.');
    if (!s.business_name?.trim()) errors.push('Business Name is required.');
    if (s.is_franchise && !s.franchisor_name?.trim()) errors.push('Franchisor Name is required.');
  }
  if (step === 2) {
    const branches = getFormBranches(form);
    if (branches.length > MAX_BRANCHES) errors.push(`Declare at most ${MAX_BRANCHES} branches.`);
    branches.forEach((branch, index) => {
      const label = branch.branch_name?.trim() || `Branch ${index + 1}`;
      if (!branch.branch_name?.trim()) errors.push(`${label}: Enter a branch name.`);
      if (!branch.address_line1?.trim()) errors.push(`${label}: Enter the street address.`);
      const barangay = barangays.find(b => b.name === branch.barangay);
      if (!barangay || !barangay.zone?.is_active) errors.push(`${label}: Select a barangay with an active zone.`);
      if (!TENANCY_TYPES.includes(branch.tenancy_type)) errors.push(`${label}: Select the property tenancy.`);
    });
  }
  if (step === 3) {
    for (const branch of getFormBranches(form)) {
      const activities = branch.lineOfBusinesses || [];
      const label = branch.branch_name || 'Branch';
      if (!activities.length) errors.push(`${label}: Declare at least one line of business.`);
      if (activities.length > 50) errors.push(`${label}: Declare at most 50 activities.`);
      const names = new Set();
      activities.forEach((activity, i) => {
        if (!activity.name?.trim()) errors.push(`Line of Business #${i + 1}: select a business activity.`);
        if (activity.name?.trim().toLowerCase() === 'other services') errors.push(`${label}: Replace Other Services with a defined activity.`);
        if (names.has(activity.name)) errors.push(`${label}: Declare each business activity only once.`);
        names.add(activity.name);
        if (!(Number(activity.capital_investment) > 0)) errors.push(`Line of Business #${i + 1}: Capital Investment must be greater than zero.`);
        const grossSales = Number(activity.gross_sales_prev_year || 0);
        if (!Number.isFinite(grossSales) || grossSales < 0) errors.push(`Line of Business #${i + 1}: Previous year gross sales must be zero or greater.`);
        if (metrics[activity.name] && !(Number.isInteger(Number(activity.metric_count)) && Number(activity.metric_count) > 0)) errors.push(`Line of Business #${i + 1}: ${metrics[activity.name].metric} must be a positive whole number.`);
      });
      const stalls = branch.stall_unit_numbers || [];
      if (stalls.some(value => !value.trim() || value.trim().length > 64)) errors.push('Enter each unit / stall number (up to 64 characters), or remove the blank entry.');
      if (new Set(stalls.map(s => s.trim().toLowerCase())).size !== stalls.length) errors.push('Unit / stall numbers must be unique.');
      if (stalls.length > 50) errors.push('Declare no more than 50 units / stalls.');
    }
  }
  if (step === 4) {
    if (!requirements.length) errors.push('Wait for the document requirements to load.');
    for (const requirement of requirements) {
      const files = documentFiles(form.step4.documents, requirement);
      const min = requirement.name === 'Valid Government ID' ? 2 : 1;
      const branchName = getFormBranches(form).find(branch => branch.branch_key === requirement.branch_key)?.branch_name;
      if (files.length < min) errors.push(`Please upload ${min === 2 ? 'both sides of ' : ''}${requirement.name}${branchName ? ` for ${branchName}` : ''}.`);
      if (files.length > requirement.max_files) errors.push(`${requirement.name}: maximum ${requirement.max_files} files.`);
    }
  }
  return errors;
}

export function buildSubmissionPayload(form, requirements, applicationNo) {
  const header = {
    ...form.step1, application_no: applicationNo || undefined,
    type_id: Number(form.step1.type_id), org_type_id: Number(form.step1.org_type_id),
    request_barangay_clearance: false, attestation_agreed: form.step5.attestation_agreed,
    documents: requirements.flatMap(requirement => documentFiles(form.step4.documents, requirement).map(file => ({
      requirement_id: requirement.id, branch_key: requirement.branch_key, file_path: file.file_path, file_name: file.file_name || '',
    }))),
  };
  const activities = branch => (branch.lineOfBusinesses || []).map(a => ({
    name: a.name, capitalization: Number(a.capital_investment), gross_sales_prev_year: Number(a.gross_sales_prev_year || 0),
    units: Number(a.units || 1), metric_count: a.metric_count ? Number(a.metric_count) : null,
  }));
  if (form.step2.branches?.length || requirements.some(requirement => 'branch_key' in requirement)) {
    return { ...header, branches: getFormBranches(form).map(branch => ({
      branch_key: branch.branch_key, branch_name: branch.branch_name.trim(), address_line1: branch.address_line1, barangay: branch.barangay,
      tenancy_type: branch.tenancy_type, stall_unit_numbers: (branch.stall_unit_numbers || []).map(s => s.trim()), activities: activities(branch),
    })) };
  }
  return {
    ...header, ...form.step2, city: 'Liliw', province: 'Laguna', is_renting: form.step2.tenancy_type === 'Rented',
    stall_unit_numbers: form.step3.stall_unit_numbers.map(s => s.trim()),
    activities: activities(form.step3),
  };
}
