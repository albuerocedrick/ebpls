export const TENANCY_TYPES = ['Rented', 'Owned Commercial', 'Owned Residential'];

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
    const files = document.files || [document];
    const group = documents.get(id) || [];
    group.push(...files.filter(file => file.file_path).map(file => ({ ...file, url: undefined })));
    documents.set(id, group);
  }
  form.step4.documents = [...documents].map(([requirement_id, files]) => ({ requirement_id, files }));
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
    const s = form.step2;
    if (!s.address_line1?.trim()) errors.push('Address Line 1 (Bldg. No. / Street) is required.');
    const barangay = barangays.find(b => b.name === s.barangay);
    if (!barangay || !Number.isFinite(Number(barangay.latitude)) || !Number.isFinite(Number(barangay.longitude))) errors.push('Select a barangay after the location list loads.');
    if (!TENANCY_TYPES.includes(s.tenancy_type)) errors.push('Select your property tenancy.');
  }
  if (step === 3) {
    const activities = form.step3.lineOfBusinesses || [];
    if (!activities.length) errors.push('At least one Line of Business must be declared.');
    const names = new Set();
    activities.forEach((activity, i) => {
      if (!activity.name?.trim()) errors.push(`Line of Business #${i + 1}: select a business activity.`);
      if (names.has(activity.name)) errors.push('Declare each business activity only once.');
      names.add(activity.name);
      if (!(Number(activity.capital_investment) > 0)) errors.push(`Line of Business #${i + 1}: Capital Investment must be greater than zero.`);
      const grossSales = Number(activity.gross_sales_prev_year || 0);
      if (!Number.isFinite(grossSales) || grossSales < 0) errors.push(`Line of Business #${i + 1}: Previous year gross sales must be zero or greater.`);
      if (metrics[activity.name] && !(Number(activity.metric_count) > 0)) errors.push(`Line of Business #${i + 1}: ${metrics[activity.name].metric} is required.`);
    });
    const stalls = form.step3.stall_unit_numbers || [];
    if (stalls.some(value => !value.trim() || value.trim().length > 64)) errors.push('Enter each unit / stall number (up to 64 characters), or remove the blank entry.');
    if (new Set(stalls.map(s => s.trim().toLowerCase())).size !== stalls.length) errors.push('Unit / stall numbers must be unique.');
    if (stalls.length > 50) errors.push('Declare no more than 50 units / stalls.');
  }
  if (step === 4) {
    if (!requirements.length) errors.push('Wait for the document requirements to load.');
    for (const requirement of requirements) {
      const doc = form.step4.documents.find(d => Number(d.requirement_id) === requirement.id);
      const files = (doc?.files || (doc ? [doc] : [])).filter(file => file.file_path);
      const min = requirement.name === 'Valid Government ID' ? 2 : 1;
      if (files.length < min) errors.push(`Please upload ${min === 2 ? 'both sides of ' : ''}${requirement.name}.`);
      if (files.length > requirement.max_files) errors.push(`${requirement.name}: maximum ${requirement.max_files} files.`);
    }
  }
  return errors;
}

export function buildSubmissionPayload(form, requirements, applicationNo) {
  const ids = new Set(requirements.map(r => r.id));
  return {
    ...form.step1, application_no: applicationNo || undefined,
    type_id: Number(form.step1.type_id), org_type_id: Number(form.step1.org_type_id),
    ...form.step2, city: 'Liliw', province: 'Laguna', is_renting: form.step2.tenancy_type === 'Rented',
    request_barangay_clearance: false, attestation_agreed: form.step5.attestation_agreed,
    stall_unit_numbers: form.step3.stall_unit_numbers.map(s => s.trim()),
    documents: form.step4.documents.filter(d => ids.has(Number(d.requirement_id))).flatMap(doc =>
      (doc.files || [doc]).filter(f => f.file_path).map(file => ({requirement_id: Number(doc.requirement_id), file_path: file.file_path, file_name: file.file_name || ''}))),
    activities: form.step3.lineOfBusinesses.map(a => ({name: a.name, capitalization: Number(a.capital_investment), gross_sales_prev_year: Number(a.gross_sales_prev_year || 0), units: Number(a.units || 1), metric_count: a.metric_count ? Number(a.metric_count) : null})),
  };
}
