/**
 * ApplicantLayout.jsx
 * Mobile-first layout for the Applicant portal.
 *
 * Structure:
 *   - Top: Navbar (simplified, no sidebar toggle)
 *   - Center: Scrollable content area (<Outlet />)
 *   - Bottom: BottomNav (fixed, thumb-reachable tabs)
 *
 * @policy  MOBILE-FIRST. All spacing, typography, and touch targets must
 *          be designed for a ~390px viewport first.
 * @policy  Content area must have padding-bottom equal to --bottom-nav-height
 *          so content is never hidden behind the fixed BottomNav.
 * @policy  Canvas uses --color-surface-applicant (slight blue bias) to
 *          orient the user within the Applicant portal.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar, BottomNav } from '../components/layout';

const ApplicantLayout = () => {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'hsl(var(--color-surface-applicant))' }}
    >
      {/* Top Navbar — no sidebar toggle for Applicant */}
      <Navbar
        portalLabel="Applicant Portal"
        showSidebarToggle={false}
      />

      {/* Content area — offset by navbar height, padded for bottom nav */}
      <main
        id="applicant-content"
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: 'var(--navbar-height)',
          paddingBottom: 'var(--bottom-nav-height)',
        }}
      >
        <div className="px-4 py-4 max-w-2xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Bottom navigation — fixed, thumb-reachable */}
      <BottomNav />
    </div>
  );
};

export default ApplicantLayout;
