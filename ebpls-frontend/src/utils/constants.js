/**
 * constants.js
 * Single source of truth for all system-level enumerations.
 * All objects are frozen to prevent accidental mutation.
 *
 * @policy No component should use a raw string for roles, routes, or statuses.
 *         Always reference from this file.
 */

// =========================================
// RBAC Role Types
// =========================================
export const ROLES = Object.freeze({
  APPLICANT:         'Applicant',
  BPLO_OFFICER:      'BPLO_Officer',
  TREASURY_OFFICER:  'Treasury_Officer', // Canonical key matching backend
  TREASURY:          'Treasury_Officer', // Alias for frontend compatibility
  BARANGAY_OFFICER:  'Barangay_Officer',
  ADMIN:             'Admin',
});


// =========================================
// Application State Machine — Valid Statuses
// Mirrors the state machine defined in the architecture.
// =========================================
export const STATUSES = Object.freeze({
  DRAFT:              'Draft',
  PENDING:            'Pending',
  UNDER_REVIEW:       'Under Review',
  RETURNED:           'Returned',
  VERIFIED:           'Verified',
  FOR_ASSESSMENT:     'For Assessment',
  ASSESSED:           'Assessed',
  FOR_PAYMENT:        'For Payment',
  PAYMENT_PROCESSING: 'PaymentProcessing',
  PAID:               'Paid',
  COMPLETED:          'Completed',
  // Retirement sub-flow
  RETIREMENT_PENDING:  'Retirement Pending',
  RETIREMENT_ASSESSED: 'Retirement Assessed',
  RETIREMENT_PAID:     'Retirement Paid',
  RETIRED:             'Retired',
});

// Alias for compatibility with existing components
export const APP_STATUS = STATUSES;

// =========================================
// Route Paths
// Single source for all frontend navigation.
// =========================================
export const ROUTES = Object.freeze({
  // Public
  HOME: '/',
  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  // Applicant
  APPLICANT_DASHBOARD: '/applicant/dashboard',
  APPLICANT_UAF: '/applicant/apply',
  APPLICANT_STATUS: '/applicant/status',
  APPLICANT_RETIRE: '/applicant/retire',
  // BPLO
  BPLO_DASHBOARD: '/bplo/dashboard',
  BPLO_VERIFIER: '/bplo/verify/:appNo',
  BPLO_RETIREMENTS: '/bplo/retirements',
  // Treasury
  TREASURY_ASSESSMENT: '/treasury/assess',
  TREASURY_CASHIER: '/treasury/cashier',
  TREASURY_QUEUE: '/treasury/queue',
  // Barangay
  BARANGAY_QUEUE: '/barangay/queue',
  // Admin
  ADMIN_MASTER_DATA: '/admin/master-data',
  ADMIN_DOCUMENT_BUILDER: '/admin/document-builder',
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',
  // Payment Callbacks
  PAYMENT_SUCCESS: '/payment/success',
  PAYMENT_CANCEL: '/payment/cancel',
});

// =========================================
// Role → Dashboard Route Map
// =========================================
export const ROLE_DASHBOARDS = Object.freeze({
  [ROLES.APPLICANT]:        ROUTES.APPLICANT_DASHBOARD,
  [ROLES.BPLO_OFFICER]:     ROUTES.BPLO_DASHBOARD,
  [ROLES.TREASURY_OFFICER]: ROUTES.TREASURY_QUEUE,
  [ROLES.TREASURY]:         ROUTES.TREASURY_QUEUE,
  [ROLES.BARANGAY_OFFICER]: ROUTES.BARANGAY_QUEUE,
  [ROLES.ADMIN]:            ROUTES.ADMIN_MASTER_DATA,
});

// =========================================
// API Configuration
// =========================================
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const API_ENDPOINTS = Object.freeze({
  // Auth
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_FORGOT_PASSWORD: '/api/auth/forgot-password',
  // Applications
  APPLICATIONS_DRAFTS: '/api/applications/drafts',
  APPLICATIONS_SUBMIT: '/api/applications/uaf',
  APPLICATIONS_UPLOAD: '/api/applications/upload',
  APPLICATIONS_STATUS: (appNo) => `/api/applications/${appNo}/status`,
  APPLICATIONS_EDIT: (appNo) => `/api/applications/${appNo}/edit`,
  // BPLO
  BPLO_PENDING: '/api/bplo/applications/pending',
  BPLO_VERIFY: (appNo) => `/api/bplo/applications/verify/${appNo}`,
  BPLO_RETURN: (appNo) => `/api/bplo/applications/return/${appNo}`,
  BPLO_REVIEW: (appNo) => `/api/bplo/applications/review/${appNo}`,
  BPLO_DOCUMENT_URL: (appNo, requirementId) => `/api/bplo/applications/${appNo}/document/${requirementId}`,
  // Treasury
  TREASURY_ASSESS: '/api/treasury/assess',
  TREASURY_OTC_PAYMENT: '/api/treasury/payments/otc',
  // Retirement
  RETIREMENT_SUBMIT: '/api/retirement/submit',
  RETIREMENT_MY: '/api/retirement/my',
  RETIREMENT_QUEUE: '/api/retirement/queue',
  RETIREMENT_ACKNOWLEDGE: (id) => `/api/retirement/${id}/acknowledge`,
  RETIREMENT_ASSESS: (id) => `/api/retirement/${id}/assess`,
  RETIREMENT_PAYMENT: (id) => `/api/retirement/${id}/record-payment`,
  RETIREMENT_COMPLETE: (id) => `/api/retirement/${id}/complete`,
  RETIREMENT_DETAIL: (id) => `/api/retirement/${id}`,
  // Documents
  DOCUMENTS_PERMIT: (appNo) => `/api/documents/permit/${appNo}`,
  DOCUMENTS_ERESIBO: (transactionId) => `/api/documents/eresibo/${transactionId}`,
  DOCUMENTS_TOP: (appNo) => `/api/documents/top/${appNo}`,
  DOCUMENTS_BARANGAY: (id) => `/api/documents/barangay-clearance/${id}`,
});

// =========================================
// State Transitions & Error Codes (Sync with Backend)
// =========================================
export const VALID_TRANSITIONS = Object.freeze({
  [STATUSES.DRAFT]:          [STATUSES.PENDING],
  [STATUSES.PENDING]:        [STATUSES.UNDER_REVIEW],
  [STATUSES.UNDER_REVIEW]:   [STATUSES.VERIFIED, STATUSES.RETURNED],
  [STATUSES.VERIFIED]:       [STATUSES.FOR_ASSESSMENT],
  [STATUSES.FOR_ASSESSMENT]: [STATUSES.ASSESSED],
  [STATUSES.ASSESSED]:       [STATUSES.FOR_PAYMENT],
  [STATUSES.FOR_PAYMENT]:    [STATUSES.PAID, STATUSES.PAYMENT_PROCESSING],
  [STATUSES.PAYMENT_PROCESSING]: [STATUSES.PAID, STATUSES.FOR_PAYMENT],
  [STATUSES.PAID]:           [STATUSES.COMPLETED],
  [STATUSES.RETURNED]:       [STATUSES.PENDING],
});

export const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR:    'VALIDATION_ERROR',
  UNAUTHORIZED:        'UNAUTHORIZED',
  FORBIDDEN:           'FORBIDDEN',
  NOT_FOUND:           'NOT_FOUND',
  CONFLICT:            'CONFLICT',
  INTERNAL_ERROR:      'INTERNAL_ERROR',
  INVALID_TRANSITION:  'INVALID_TRANSITION',
});

export const PAYMENT_MODES = Object.freeze({
  CASH: 'Cash',
  MANAGERS_CHECK: 'Manager Check',
  ONLINE: 'Online',
});

export const EMAIL_TRIGGERS = Object.freeze({
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

export const DOC_VERIFICATION_STATUS = Object.freeze({
  PENDING:           'Pending',
  VERIFIED:          'Verified',
  YES:               'Yes',
  NO:                'No',
  RETURNED:          'Returned',
  NOT_NEEDED:        'Not Needed',
  AWAITING_ISSUANCE: 'Awaiting Issuance',
});
