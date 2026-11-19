// =================================================================
// File: src/utils/validators.js
// Purpose: Centralized Zod validation schemas.
// Policy:  Distrust All Client Data. All inputs must be validated
//          against these strict schemas before reaching the service layer.
// =================================================================

const { z } = require('zod');
const { CORRECTABLE_FIELDS } = require('./constants');

// -----------------------------------------------------------------
// 1. Draft Payload Schema
// -----------------------------------------------------------------
const DraftPayloadSchema = z.object({
  current_step: z
    .number({ required_error: "current_step is required", invalid_type_error: "current_step must be a number" })
    .int()
    .min(1, "Step must be at least 1")
    .max(5, "Step must be at most 5"),
  form_data: z
    .record(z.string(), z.any())
    .default({}),
});

// -----------------------------------------------------------------
// 2. Final UAF Submission Payload Schema
// Decomposed into business and application table requirements.
// -----------------------------------------------------------------
const tenancySchema = z.enum(['Rented', 'Owned Commercial', 'Owned Residential']);
const stallSchema = z.array(z.string().trim().min(1).max(64)).max(50).default([])
  .refine(values => new Set(values.map(value => value.toLowerCase())).size === values.length, 'Unit / stall numbers must be unique.');
const branchKeySchema = z.union([z.literal('main'), z.string().uuid()]);
const activitySchema = z.object({
  name: z.string().trim().min(1).max(255),
  capitalization: z.coerce.number().positive().max(9999999999999.99),
  gross_sales_prev_year: z.coerce.number().min(0).max(9999999999999.99).default(0),
  units: z.coerce.number().int().min(1).default(1),
  metric_count: z.coerce.number().int().positive().max(2147483647).optional().nullable(),
});
const documentSchema = z.object({
  requirement_id: z.coerce.number().int().positive(),
  file_path: z.string().min(1),
  file_name: z.string().optional().default(''),
  branch_key: branchKeySchema.nullish(),
});
const submissionHeader = z.object({
  // Application Data
  application_no: z.string().optional(),
  type_id: z.coerce.number().int().positive("Application type ID is required"),
  // payment_mode_id removed — payment is always annual (migration 033)

  // Business Data
  business_name: z.string().min(1, "Business name is required"),
  trade_name: z.string().optional(),
  org_type_id: z.coerce.number().int().positive("Organization type ID is required"),
  dti_sec_cda_reg_no: z.string().optional(),
  
  is_franchise: z.boolean().default(false),
  franchisor_name: z.string().optional(),

  // Barangay Clearance — Phase 3C
  request_barangay_clearance: z.literal(false).default(false),
  
  attestation_agreed: z.literal(true),
});

const branchAddress = {
  tenancy_type: tenancySchema,
  stall_unit_numbers: stallSchema,
  address_line1: z.string().trim().min(1).max(255),
  barangay: z.string().trim().min(1).max(100),
  activities: z.array(activitySchema).min(1).max(50),
};
const legacySubmission = submissionHeader.extend({
  ...branchAddress,
  branches: z.never().optional(),
  is_renting: z.boolean().default(false),
  documents: z.array(documentSchema).max(100).default([]),
  city: z.literal('Liliw').default('Liliw'),
  province: z.literal('Laguna').default('Laguna'),

  // Geolocation Data
  // These are overwritten with the selected barangay's trusted centroid.
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});
function validBranchKeys(branches) {
  return branches[0]?.branch_key === 'main' && new Set(branches.map(branch => branch.branch_key)).size === branches.length;
}
const branchSubmission = submissionHeader.extend({
  branches: z.array(z.object({ ...branchAddress, branch_key: branchKeySchema, branch_name: z.string().trim().min(1).max(100) }))
    .min(1).max(10).refine(validBranchKeys, 'Include one main branch first and use unique branch identifiers.'),
  documents: z.array(documentSchema).max(500).default([]),
});
const UAFSubmissionPayloadSchema = z.union([branchSubmission, legacySubmission]).refine((data) => {
  // Enforce franchisor name requirement if it is a franchise
  if (data.is_franchise && (!data.franchisor_name || data.franchisor_name.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "Franchisor name is required if the business is a franchise",
  path: ["franchisor_name"],
});

// -----------------------------------------------------------------
// 3. Upload Request Payload Schema
// -----------------------------------------------------------------
const UploadRequestPayloadSchema = z.object({
  fileName: z.string().min(1, "File name is required")
    // Security Guard: Prevent path traversal attacks
    .refine((name) => !name.includes('..') && !name.includes('/') && !name.includes('\\'), {
      message: "Invalid file name. Path traversal characters are not allowed.",
    }),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png'], {
    errorMap: () => ({ message: "Invalid file type. Only PDF, JPEG, and PNG are allowed." }),
  }),
});

const ApplicantRequirementsQuerySchema = z.object({
  type_id: z.coerce.number().int().min(1).max(3),
  org_type_id: z.coerce.number().int().positive().optional(),
  tenancy_type: z.enum(['Rented', 'Owned Commercial', 'Owned Residential']).optional(),
  is_renting: z.enum(['true', 'false']).optional(),
  activity_names: z.preprocess(value => {
    if (value === undefined) return [];
    if (typeof value !== 'string') return value;
    if (value.startsWith('[')) { try { return JSON.parse(value); } catch { return value; } }
    return value.split(',').map(name => name.trim()).filter(Boolean);
  }, z.array(z.string()).max(50)),
});

const BranchRequirementsSchema = z.object({
  type_id: z.coerce.number().int().min(1).max(3),
  org_type_id: z.coerce.number().int().positive(),
  branches: z.array(z.object({
    branch_key: branchKeySchema,
    tenancy_type: tenancySchema,
    activity_names: z.array(z.string().max(255)).max(50),
  })).min(1).max(10).refine(validBranchKeys, 'Include one main branch first and use unique branch identifiers.'),
});

// -----------------------------------------------------------------
// 4. Correction Request Payload Schemas
// -----------------------------------------------------------------
const CorrectionRequestSchema = z.object({
  application_no:  z.string().min(1),
  field_name:      z.enum(CORRECTABLE_FIELDS),
  new_value:       z.string().min(1).max(500),
  proof_file_path: z.string().optional(),
});

const CorrectionRejectSchema = z.object({
  remarks: z.string().min(1, 'Remarks are required for rejection'),
});

// -----------------------------------------------------------------
// 5. Renewal Submission Payload Schema (Phase 4)
// -----------------------------------------------------------------
const RenewalBranchActivitySchema = z.object({
  activity_id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1).max(255).optional(),
  gross_sales_prev_year: z.coerce.number().min(0).max(9999999999999.99).default(0),
  capitalization: z.coerce.number().min(0).max(9999999999999.99).default(0),
  units: z.coerce.number().int().min(1).default(1),
  metric_count: z.coerce.number().int().positive().max(2147483647).optional().nullable(),
});

const RenewalBranchSchema = z.object({
  branch_id: z.string().uuid().optional(),
  branch_key: branchKeySchema.optional(),
  branch_name: z.string().trim().min(1).max(100),
  address_line1: z.string().trim().min(1).max(255),
  barangay: z.string().trim().min(1).max(100),
  tenancy_type: tenancySchema,
  stall_unit_numbers: stallSchema,
  is_main: z.boolean().default(false),
  activities: z.array(RenewalBranchActivitySchema).min(1, 'Each renewed branch must declare at least one line of business.'),
});

const RenewalSubmissionPayloadSchema = z.object({
  business_id: z.string().uuid('A valid business UUID is required for renewal.'),
  selected_branch_ids: z.array(z.string().uuid()).min(1, 'Select at least one branch to renew.').optional(),
  unselected_branch_ids: z.array(z.string().uuid()).default([]),
  branches: z.array(RenewalBranchSchema).min(1, 'At least one branch must be included in the renewal.'),
  documents: z.array(documentSchema).default([]),
});

const AddressAmendmentPayloadSchema = z.object({
  business_id: z.string().uuid('A valid business UUID is required for amendment.'),
  branch_id: z.string().uuid('A valid branch UUID is required for address relocation.'),
  new_address_line1: z.string().trim().min(1, 'New street address is required.').max(255),
  new_barangay: z.string().trim().min(1, 'New barangay is required.').max(100),
  new_tenancy_type: tenancySchema,
  new_stall_unit_numbers: stallSchema.default([]),
  documents: z.array(z.object({
    requirement_id: z.coerce.number().int().positive('Requirement ID is required.'),
    file_path: z.string().min(1, 'Uploaded file path is required.'),
    file_name: z.string().min(1, 'File name is required.'),
    file_size: z.coerce.number().int().nonnegative().optional().default(0),
  })).min(1, 'Upload the required premises clearances for the new location.'),
  attestation_agreed: z.literal(true, {
    errorMap: () => ({ message: 'You must attest that all provided relocation information is true and correct.' }),
  }),
});

module.exports = {
  DraftPayloadSchema,
  UAFSubmissionPayloadSchema,
  UploadRequestPayloadSchema,
  ApplicantRequirementsQuerySchema,
  BranchRequirementsSchema,
  CorrectionRequestSchema,
  CorrectionRejectSchema,
  RenewalBranchSchema,
  RenewalSubmissionPayloadSchema,
  AddressAmendmentPayloadSchema,
};
