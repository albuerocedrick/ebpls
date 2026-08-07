/**
 * BottomNav.jsx
 * Mobile-first bottom navigation bar.
 * Used EXCLUSIVELY by: ApplicantLayout.
 *
 * The Applicant portal is mobile-first. This component provides
 * thumb-reachable tab navigation fixed to the bottom of the viewport.
 *
 * @policy  Height fixed at var(--bottom-nav-height) = 4rem.
 *          ApplicantLayout must add padding-bottom of this value to
 *          prevent content from being hidden behind the nav.
 * @policy  Max 5 tab items (mobile thumb UX limit). Currently 3.
 * @policy  Active tab uses the accent token for the icon + label.
 *          The indicator is a small top-border line — not a filled pill
 *          (which would violate the 60-30-10 rule at 100% tab width).
 * @policy  Lucide icons only. Icon size: 22px.
 * @policy  No emojis.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import { LayoutDashboard, FilePlus, FileText } from 'lucide-react';

// =========================================
// Tab Configuration — Applicant-specific
// =========================================

const TABS = [
  {
    to: ROUTES.APPLICANT_DASHBOARD,
    icon: <LayoutDashboard size={22} />,
    label: 'Dashboard',
    id: 'bottom-nav-dashboard',
  },
  {
    to: ROUTES.APPLICANT_UAF,
    icon: <FilePlus size={22} />,
    label: 'Apply',
    id: 'bottom-nav-apply',
  },
  {
    to: ROUTES.APPLICANT_FEE_SCHEDULE,
    icon: <FileText size={22} />,
    label: 'Schedule',
    id: 'bottom-nav-fee-schedule',
  },
];

// =========================================
// Component
// =========================================

const BottomNav = () => {
  return (
    <nav
      aria-label="Main mobile navigation"
      className={[
        'fixed bottom-0 left-0 right-0',
        'flex items-stretch',
        'bg-white/90 backdrop-blur-xl',
        'border-t border-gray-200/50',
        'z-[var(--z-sticky)]',
        'pb-safe',
      ].join(' ')}
      style={{ height: 'var(--bottom-nav-height)' }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          id={tab.id}
          className={({ isActive }) =>
            [
              'flex-1 flex flex-col items-center justify-center gap-1',
              'text-[11px] font-semibold',
              'transition-all duration-200',
              'relative',
              isActive
                ? [
                    'text-gray-900',
                    'after:absolute after:top-0 after:left-6 after:right-6',
                    'after:h-0.5 after:rounded-full after:bg-gray-900',
                  ].join(' ')
                : 'text-gray-400 hover:text-gray-600',
            ].join(' ')
          }
          aria-label={tab.label}
        >
          {({ isActive }) => (
            <>
              <span
                className={[
                  'transition-transform duration-200',
                  isActive ? 'scale-110' : 'scale-100',
                ].join(' ')}
                aria-hidden="true"
              >
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
