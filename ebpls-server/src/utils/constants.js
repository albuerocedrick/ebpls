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
// Source: supabase/migrations/001_roles.sql
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
// Source: supabase/migrations/005_applications.sql + 018_paymongo_payment.sql
// -----------------------------------------------------------------
const STATUSES = Object.freeze({
  DRAFT:              'Draft',
  PENDING:            'Pending',
  UNDER_REVIEW:       'Under Review',
  VERIFIED:           'Verified',
  FOR_ASSESSMENT:     'For Assessment',
  ASSESSED:           'Assessed',
  FOR_PAYMENT:        'For Payment',
  PAYMENT_PROCESSING: 'PaymentProcessing', // Added for Phase 5 Online Payments
  PAID:               'Paid',
  COMPLETED:          'Completed',
  RETURNED:           'Returned',
});

// -----------------------------------------------------------------
// TRANSITION LOGIC
// Updated: Uses arrays to support multiple valid next states (branching).
// -----------------------------------------------------------------
const VALID_TRANSITIONS = Object.freeze({
  [STATUSES.DRAFT]:          [STATUSES.PENDING],
  [STATUSES.PENDING]:        [STATUSES.UNDER_REVIEW],
  [STATUSES.UNDER_REVIEW]:   [STATUSES.VERIFIED, STATUSES.RETURNED],
  [STATUSES.VERIFIED]:       [STATUSES.FOR_ASSESSMENT],
  [STATUSES.FOR_ASSESSMENT]: [STATUSES.ASSESSED],
  [STATUSES.ASSESSED]:       [STATUSES.FOR_PAYMENT],
  
  // From "For Payment", user can pay OTC (Paid) or Online (PaymentProcessing)
  [STATUSES.FOR_PAYMENT]:    [STATUSES.PAID, STATUSES.PAYMENT_PROCESSING],
  
  // From "PaymentProcessing", can succeed (Paid) or fail/expire (back to For Payment)
  [STATUSES.PAYMENT_PROCESSING]: [STATUSES.PAID, STATUSES.FOR_PAYMENT],
  
  [STATUSES.PAID]:           [STATUSES.COMPLETED],
  [STATUSES.RETURNED]:       [STATUSES.PENDING],
});

// -----------------------------------------------------------------
// AUDIT ACTIONS
// Source: supabase/migrations/011_audit_logs.sql
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
  APPLICATION_STATUS_UPDATED: 'APPLICATION_STATUS_UPDATED',

  // Treasury (Enhanced for Phase 5)
  ASSESSMENT_CREATED:         'ASSESSMENT_CREATED',
  ASSESSMENT_LINE_OVERRIDDEN: 'ASSESSMENT_LINE_OVERRIDDEN',
  PAYMENT_RECORDED:           'PAYMENT_RECORDED',
  FEE_ASSESSED:               'FEE_ASSESSED',
  FEE_OVERRIDE:               'FEE_OVERRIDE',
  OTC_PAYMENT_RECORDED:       'OTC_PAYMENT_RECORDED',
  
  // Online Payment Actions
  ONLINE_PAYMENT_INITIATED:   'ONLINE_PAYMENT_INITIATED',
  ONLINE_PAYMENT_CONFIRMED:   'ONLINE_PAYMENT_CONFIRMED',
  ONLINE_PAYMENT_FAILED:      'ONLINE_PAYMENT_FAILED',

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
// HTTP ERROR CODES
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
// Source: supabase/migrations/012_email_notifications.sql
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
// -----------------------------------------------------------------
const DOC_VERIFICATION_STATUS = Object.freeze({
  PENDING:           'Pending',
  VERIFIED:          'Verified',
  YES:               'Yes',
  NO:                'No',
  RETURNED:          'Returned',
  NOT_NEEDED:        'Not Needed',
  AWAITING_ISSUANCE: 'Awaiting Issuance',
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