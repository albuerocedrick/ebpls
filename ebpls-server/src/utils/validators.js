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
    .record(z.any(), { invalid_type_error: "form_data must be a valid JSON object" })
    .default({}),
});

// -----------------------------------------------------------------
// 2. Final UAF Submission Payload Schema
// Decomposed into business and application table requirements.
// -----------------------------------------------------------------
const UAFSubmissionPayloadSchema = z.object({
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
  request_barangay_clearance: z.boolean().default(false),
  
  // Rental Status - Phase 3
  is_renting: z.boolean().default(false),

  // Uploaded documents — array of { requirement_id, file_path, file_name }
  documents: z.array(
    z.object({
      requirement_id: z.coerce.number().int().positive(),
      file_path: z.string().min(1),
      file_name: z.string().optional().default(''),
    })
  ).optional().default([]),

  // Line of Business activities
  activities: z.array(
    z.object({
      name: z.string().min(1),
      capitalization: z.coerce.number().min(0).default(0),
      gross_sales_prev_year: z.coerce.number().min(0).default(0),
      units: z.coerce.number().int().min(1).default(1),
      metric_count: z.coerce.number().int().positive().optional().nullable(),
    })
  ).optional().default([]),

  // Address Data
  address_line1: z.string().optional(),
  barangay: z.string().optional(),
  city: z.string().default('Liliw'),
  province: z.string().default('Laguna'),

  // Geolocation Data
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
}).refine((data) => {
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

module.exports = {
  DraftPayloadSchema,
  UAFSubmissionPayloadSchema,
  UploadRequestPayloadSchema,
  CorrectionRequestSchema,
  CorrectionRejectSchema,
};