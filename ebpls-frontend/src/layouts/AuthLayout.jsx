/**
 * AuthLayout.jsx
 * Centered card layout for public auth screens: Login, Register, ForgotPassword.
 *
 * Structure: Full-viewport centered flex container with a branded header
 * and a Card panel that wraps the auth form content.
 *
 * @policy  No Sidebar or BottomNav — auth pages are public, role-free.
 * @policy  Background uses --color-surface-tint for a subtle depth effect
 *          behind the white card (avoids flat white-on-white).
 * @policy  The brand accent is a single colored dot — 10% rule enforced.
 */

import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { ROUTES, ROLE_DASHBOARDS } from '../utils/constants';

const AuthLayout = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user            = useAuthStore((s) => s.user);
  const role            = user?.roleName;

  // Guest Guard: If already logged in, redirect to the correct dashboard
  if (isAuthenticated) {
    const destination = ROLE_DASHBOARDS[role] ?? ROUTES.HOME;
    return <Navigate to={destination} replace />;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'hsl(var(--color-surface-tint))' }}
    >
      {/* Brand header */}
      <div className="flex items-center gap-2 mb-8">
        <span
          className="w-3 h-3 rounded-full bg-accent"
          aria-hidden="true"
        />
        <span className="text-lg font-bold text-[hsl(var(--color-text))]">
          eBPLS
        </span>
        <span className="text-sm text-[hsl(var(--color-text-muted))]">
          Municipality of Liliw
        </span>
      </div>

      {/* Auth card — white surface on tinted canvas (no double-layer violation) */}
      <div
        className="w-full max-w-md bg-[hsl(var(--color-surface-raised))] rounded-xl border border-border shadow-sm"
      >
        <Outlet />
      </div>

      {/* Footer note */}
      <p className="mt-6 text-xs text-[hsl(var(--color-text-muted))] text-center">
        eBPLS — BOSS &amp; E-Resibo &nbsp;&middot;&nbsp; OTC Payments Only
      </p>
    </div>
  );
};

export default AuthLayout;
