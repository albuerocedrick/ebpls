// =================================================================
// File: src/utils/constants.js
// Purpose: Single source of truth for all canonical string constants
//          used across the backend. These values MUST match the seeded
//          data in supabase/migrations/ and must never be hardcoded
//          in controllers or services.
// Policy:  No magic strings. Import from here.
// =================================================================

// -----------------------------------------------------------------
// RBAC ROLES
// Source: supabase/migrations/001_roles.sql (seeded role_name values)
// These are the exact strings stored in public.roles.role_name.
// Any change here must be reflected in the database seed.
// -----------------------------------------------------------------
const ROLES = Object.freeze({
  APPLICANT:         'Applicant',
  BPLO_OFFICER:      'BPLO_Officer',
  TREASURY_OFFICER:  'Treasury_Officer',
  BARANGAY_OFFICER:  'Barangay_Officer',
  ADMIN:             'Admin',
});

// -----------------------------------------------------------------
// APPLICATION STATE MACHINE
// Source: supabase/migrations/005_applications.sql (status enum)
// Enforces the linear workflow: no module may skip a step.
// State transition validation logic lives in src/services/application.service.js.
// -----------------------------------------------------------------
const STATUSES = Object.freeze({
  DRAFT:          'Draft',
  PENDING:        'Pending',
  UNDER_REVIEW:   'Under Review',
  VERIFIED:       'Verified',
  FOR_ASSESSMENT: 'For Assessment',
  ASSESSED:       'Assessed',
  FOR_PAYMENT:    'For Payment',
  PAID:           'Paid',
  COMPLETED:      'Completed',
  RETURNED:       'Returned',
});

// The ordered list of valid forward transitions (no skipping).
// Each status maps to the only status it can advance to.
const VALID_TRANSITIONS = Object.freeze({
  [STATUSES.DRAFT]:          STATUSES.PENDING,
  [STATUSES.PENDING]:        STATUSES.UNDER_REVIEW,
  [STATUSES.UNDER_REVIEW]:   STATUSES.VERIFIED,
  [STATUSES.VERIFIED]:       STATUSES.FOR_ASSESSMENT,
  [STATUSES.FOR_ASSESSMENT]: STATUSES.ASSESSED,
  [STATUSES.ASSESSED]:       STATUSES.FOR_PAYMENT,
  [STATUSES.FOR_PAYMENT]:    STATUSES.PAID,
  [STATUSES.PAID]:           STATUSES.COMPLETED,
  // RETURNED is a backward branch — BPLO can return from UNDER_REVIEW only.
  // Handled explicitly in the BPLO controller.
});

// -----------------------------------------------------------------
// AUDIT ACTIONS
// Source: supabase/migrations/011_audit_logs.sql (documentation block)
// These strings are written verbatim to public.audit_logs.action.
// Any new action MUST be added here AND documented in 011_audit_logs.sql.
// -----------------------------------------------------------------
const AUDIT_ACTIONS = Object.freeze({
  // Auth
  ACCOUNT_CREATED:            'ACCOUNT_CREATED',
  PASSWORD_RESET:             'PASSWORD_RESET',
  USER_ROLE_CHANGED:          'USER_ROLE_CHANGED',
  USER_DEACTIVATED:           'USER_DEACTIVATED',

  // Application Lifecycle
  APPLICATION_DRAFT_SAVED:    'APPLICATION_DRAFT_SAVED',
  APPLICATION_SUBMITTED:      'APPLICATION_SUBMITTED',
  APPLICATION_RETURNED:       'APPLICATION_RETURNED',
  APPLICATION_VERIFIED:       'APPLICATION_VERIFIED',

  // Treasury
  ASSESSMENT_CREATED:         'ASSESSMENT_CREATED',
  ASSESSMENT_LINE_OVERRIDDEN: 'ASSESSMENT_LINE_OVERRIDDEN',
  PAYMENT_RECORDED:           'PAYMENT_RECORDED',

  // Documents
  PERMIT_GENERATED:           'PERMIT_GENERATED',
  ERESIBO_GENERATED:          'ERESIBO_GENERATED',
  TOP_GENERATED:              'TOP_GENERATED',
  CLEARANCE_ISSUED:           'CLEARANCE_ISSUED',
  CLEARANCE_REJECTED:         'CLEARANCE_REJECTED',

  // Retirement
  RETIREMENT_SUBMITTED:       'RETIREMENT_SUBMITTED',
  RETIREMENT_ASSESSED:        'RETIREMENT_ASSESSED',
  RETIREMENT_COMPLETED:       'RETIREMENT_COMPLETED',

  // Admin
  MASTER_DATA_UPDATED:        'MASTER_DATA_UPDATED',
});

// -----------------------------------------------------------------
// HTTP ERROR CODES (API-level codes for consistent error responses)
// Used in error.middleware.js and throughout controllers.
// -----------------------------------------------------------------
const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR:    'VALIDATION_ERROR',
  UNAUTHORIZED:        'UNAUTHORIZED',
  FORBIDDEN:           'FORBIDDEN',
  NOT_FOUND:           'NOT_FOUND',
  CONFLICT:            'CONFLICT',
  INTERNAL_ERROR:      'INTERNAL_ERROR',
  INVALID_TRANSITION:  'INVALID_TRANSITION',
});

// -----------------------------------------------------------------
// EMAIL TRIGGERS
// Source: supabase/migrations/012_email_notifications.sql (email_trigger_event enum)
// -----------------------------------------------------------------
const EMAIL_TRIGGERS = Object.freeze({
  ACCOUNT_CREATED:            'ACCOUNT_CREATED',
  PASSWORD_RESET:             'PASSWORD_RESET',
  APPLICATION_SUBMITTED:      'APPLICATION_SUBMITTED',
  BARANGAY_CLEARANCE_REJECTED: 'BARANGAY_CLEARANCE_REJECTED',
  APPLICATION_RETURNED:       'APPLICATION_RETURNED',
  APPLICATION_VERIFIED:       'APPLICATION_VERIFIED',
  TOP_GENERATED:              'TOP_GENERATED',
  PAYMENT_RECORDED:           'PAYMENT_RECORDED',
  PERMIT_READY:               'PERMIT_READY',
  RETIREMENT_COMPLETE:        'RETIREMENT_COMPLETE',
});

// -----------------------------------------------------------------
// DOC VERIFICATION STATUS
// Source: supabase/migrations/006_verifications.sql +
//         015_design_gaps_fix.sql + 016_align_doc_status.sql
// These values MUST match the CHECK constraint on doc_verifications.status.
// -----------------------------------------------------------------
const DOC_VERIFICATION_STATUS = Object.freeze({
  PENDING:           'Pending',
  VERIFIED:          'Verified',    // Legacy value (BPLO explicit approval)
  YES:               'Yes',          // Shorthand used by BPLO checklist UI
  NO:                'No',           // Shorthand: document rejected/not submitted
  RETURNED:          'Returned',     // Document sent back for resubmission
  NOT_NEEDED:        'Not Needed',   // Requirement waived / not applicable
  AWAITING_ISSUANCE: 'Awaiting Issuance', // Barangay clearance requested, pending officer action
});

module.exports = {
  ROLES,
  STATUSES,
  VALID_TRANSITIONS,
  AUDIT_ACTIONS,
  ERROR_CODES,
  EMAIL_TRIGGERS,
  DOC_VERIFICATION_STATUS,
};
