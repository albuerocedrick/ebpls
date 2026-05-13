/**
 * App.jsx
 * Main router configuration. Maps every role's routes to its layout wrapper.
 *
 * Updated for Phase 5 (Treasury Module):
 *   - Added AssessmentQueue (List View)
 *   - Configured AssessmentGrid with :appNo parameter
 *   - Aligned ROLES with constants.js
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import {
  AuthLayout,
  ApplicantLayout,
  BPLOLayout,
  TreasuryLayout,
  BarangayLayout,
  AdminLayout,
} from './layouts';

import ProtectedRoute  from './components/shared/ProtectedRoute';
import { Toaster } from 'react-hot-toast';
import ToastContainer  from './components/shared/ToastContainer';
import { ROUTES, ROLES } from './utils/constants';

// =========================================
// Route-Level Code Splitting (React.lazy)
// =========================================

// Public
const LandingPage       = lazy(() => import('./screens/public/LandingPage'));

// Auth
const Login             = lazy(() => import('./screens/auth/Login'));
const Register          = lazy(() => import('./screens/auth/Register'));
const ForgotPassword    = lazy(() => import('./screens/auth/ForgotPassword'));

// Applicant
const ApplicantDashboard  = lazy(() => import('./screens/applicant/Dashboard'));
const UAFWizardScreen     = lazy(() => import('./screens/applicant/UAFWizardScreen'));
const StatusTracker       = lazy(() => import('./screens/applicant/StatusTracker'));

// BPLO
const BPLODashboard         = lazy(() => import('./screens/bplo/Dashboard'));
const SplitScreenVerifier   = lazy(() => import('./screens/bplo/SplitScreenVerifier'));

// Treasury (Phase 5)
const AssessmentQueue = lazy(() => import('./screens/treasury/AssessmentQueue')); // Added Queue List
const AssessmentGrid  = lazy(() => import('./screens/treasury/AssessmentGrid'));
const CashierPOS      = lazy(() => import('./screens/treasury/CashierPOS'));

// Barangay
const ClearanceQueue  = lazy(() => import('./screens/barangay/ClearanceQueue'));

// Admin
const MasterData        = lazy(() => import('./screens/admin/MasterData'));
const DocumentBuilder   = lazy(() => import('./screens/admin/DocumentBuilder'));
const AuditLogs         = lazy(() => import('./screens/admin/AuditLogs'));

// Payment
const PaymentSuccess    = lazy(() => import('./screens/payment/PaymentSuccess'));
const PaymentCancel     = lazy(() => import('./screens/payment/PaymentCancel'));

// =========================================
// Suspense Fallback
// =========================================

const PageLoader = () => (
  <div
    className="fixed inset-0 flex items-center justify-center"
    style={{ backgroundColor: 'hsl(var(--color-surface))' }}
    aria-label="Loading page"
    aria-live="polite"
  >
    <div
      className="w-6 h-6 rounded-full border-2 border-border border-t-accent animate-spin"
      aria-hidden="true"
    />
  </div>
);

// =========================================
// Not Found — catch-all route
// =========================================

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
    <span className="text-5xl font-bold text-[hsl(var(--color-border-dark))]">404</span>
    <p className="text-[hsl(var(--color-text-muted))] text-center">
      This page does not exist or you do not have access to it.
    </p>
    <a
      href={ROUTES.LOGIN}
      className="text-sm text-accent underline underline-offset-4 hover:opacity-80 transition-opacity"
    >
      Return to Login
    </a>
  </div>
);

// =========================================
// App — Root Router
// =========================================

function App() {
  return (
    <>
    <Toaster position="top-right" />
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>

        <Routes>

          {/* ── PUBLIC LANDING PAGE ───────────────── */}
          <Route path="/" element={<LandingPage />} />

          {/* ── AUTH PAGES ───────────────────────── */}
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.REGISTER} element={<Register />} />
            <Route
              path={ROUTES.FORGOT_PASSWORD}
              element={<ForgotPassword />}
            />
          </Route>

          {/* ── APPLICANT PORTAL ─────────────────── */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={[ROLES.APPLICANT, ROLES.ADMIN]}
              />
            }
          >
            <Route path="/applicant" element={<ApplicantLayout />}>
              <Route
                index
                element={<Navigate to={ROUTES.APPLICANT_DASHBOARD} replace />}
              />
              <Route path="dashboard" element={<ApplicantDashboard />} />
              <Route path="apply" element={<UAFWizardScreen />} />
              <Route path="status" element={<StatusTracker />} />
            </Route>
          </Route>

          {/* ── BPLO PORTAL ─────────────────────── */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={[ROLES.BPLO_OFFICER, ROLES.ADMIN]}
              />
            }
          >
            <Route path="/bplo" element={<BPLOLayout />}>
              <Route
                index
                element={<Navigate to={ROUTES.BPLO_DASHBOARD} replace />}
              />
              <Route path="dashboard" element={<BPLODashboard />} />
              <Route path="verify/:appNo" element={<SplitScreenVerifier />} />
              <Route path="verify" element={<SplitScreenVerifier />} />
            </Route>
          </Route>

          {/* ── TREASURY PORTAL ─────────────────── */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={[ROLES.TREASURY_OFFICER, ROLES.ADMIN]}
              />
            }
          >
            <Route path="/treasury" element={<TreasuryLayout />}>
              <Route
                index
                element={<Navigate to={ROUTES.TREASURY_QUEUE} replace />}
              />

              {/* Added: Treasury Queue (Application List) */}
              <Route
                path="queue"
                element={<AssessmentQueue />}
              />

              {/* Updated: Assessment Grid Detail with Param */}
              <Route
                path="assess/:appNo"
                element={<AssessmentGrid />}
              />

              {/* Updated: Standard path (fallback) */}
              <Route
                path="assess"
                element={<AssessmentGrid />}
              />

              <Route
                path="cashier"
                element={<CashierPOS />}
              />
            </Route>
          </Route>

          {/* ── BARANGAY PORTAL ─────────────────── */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={[ROLES.BARANGAY_OFFICER, ROLES.ADMIN]}
              />
            }
          >
            <Route path="/barangay" element={<BarangayLayout />}>
              <Route
                index
                element={<Navigate to={ROUTES.BARANGAY_QUEUE} replace />}
              />
              <Route path="queue" element={<ClearanceQueue />} />
            </Route>
          </Route>

          {/* ── ADMIN PORTAL ────────────────────── */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={[ROLES.ADMIN]}
              />
            }
          >
            <Route path="/admin" element={<AdminLayout />}>
              <Route
                index
                element={<Navigate to={ROUTES.ADMIN_MASTER_DATA} replace />}
              />
              <Route path="master-data" element={<MasterData />} />
              <Route path="document-builder" element={<DocumentBuilder />} />
              <Route path="audit-logs" element={<AuditLogs />} />
            </Route>
          </Route>

          {/* ── PAYMENT CALLBACKS ───────────────── */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={[ROLES.APPLICANT, ROLES.ADMIN]}
              />
            }
          >
            <Route path="/payment">
              <Route path="success" element={<PaymentSuccess />} />
              <Route path="cancel" element={<PaymentCancel />} />
            </Route>
          </Route>

          {/* ── 404 ─────────────────────────────── */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </Suspense>

      <ToastContainer />
    </BrowserRouter>
    </>
  );
}

export default App;