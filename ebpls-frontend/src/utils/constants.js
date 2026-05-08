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
  APPLICANT:        'Applicant',
  BPLO_OFFICER:     'BPLO_Officer',
  TREASURY:         'Treasury_Officer',
  BARANGAY_OFFICER: 'Barangay_Officer',
  ADMIN:            'Admin',
});


// =========================================
// Application State Machine — Valid Statuses
// Mirrors the state machine defined in the architecture.
// No module may reference a status string not in this list.
// =========================================
export const APP_STATUS = Object.freeze({
  DRAFT: 'Draft',
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  RETURNED: 'Returned',
  VERIFIED: 'Verified',
  FOR_ASSESSMENT: 'For Assessment',
  ASSESSED: 'Assessed',
  FOR_PAYMENT: 'For Payment',
  PAID: 'Paid',
  COMPLETED: 'Completed',
  // Retirement sub-flow
  RETIREMENT_PENDING: 'Retirement Pending',
  RETIREMENT_ASSESSED: 'Retirement Assessed',
  RETIREMENT_PAID: 'Retirement Paid',
  RETIRED: 'Retired',
});

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
  // BPLO
  BPLO_DASHBOARD: '/bplo/dashboard',
  BPLO_VERIFIER: '/bplo/verify/:appNo',
  // Treasury
  TREASURY_ASSESSMENT: '/treasury/assess',
  TREASURY_CASHIER: '/treasury/cashier',
  // Barangay
  BARANGAY_QUEUE: '/barangay/queue',
  // Admin
  ADMIN_MASTER_DATA: '/admin/master-data',
  ADMIN_DOCUMENT_BUILDER: '/admin/document-builder',
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',
});

// =========================================
// Role → Dashboard Route Map
// =========================================
export const ROLE_DASHBOARDS = Object.freeze({
  [ROLES.APPLICANT]:       ROUTES.APPLICANT_DASHBOARD,
  [ROLES.BPLO_OFFICER]:    ROUTES.BPLO_DASHBOARD,
  [ROLES.TREASURY]:        ROUTES.TREASURY_ASSESSMENT,
  [ROLES.BARANGAY_OFFICER]: ROUTES.BARANGAY_QUEUE,
  [ROLES.ADMIN]:           ROUTES.ADMIN_MASTER_DATA,
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
  // BPLO
  BPLO_PENDING: '/api/bplo/applications/pending',
  BPLO_VERIFY: (appNo) => `/api/bplo/applications/verify/${appNo}`,
  BPLO_RETURN: (appNo) => `/api/bplo/applications/return/${appNo}`,
  // Treasury
  TREASURY_ASSESS: '/api/treasury/assess',
  TREASURY_OTC_PAYMENT: '/api/treasury/payments/otc',
  // Documents
  DOCUMENTS_PERMIT: (appNo) => `/api/documents/permit/${appNo}`,
  DOCUMENTS_ERESIBO: (transactionId) => `/api/documents/eresibo/${transactionId}`,
  DOCUMENTS_TOP: (appNo) => `/api/documents/top/${appNo}`,
  DOCUMENTS_BARANGAY: (id) => `/api/documents/barangay-clearance/${id}`,
});

// =========================================
// OTC Payment Modes — Matches DB enum
// STRICT: Only Cash or Manager Check. No online payments.
// =========================================
export const PAYMENT_MODES = Object.freeze({
  CASH: 'Cash',
  MANAGERS_CHECK: 'Manager Check',
});
