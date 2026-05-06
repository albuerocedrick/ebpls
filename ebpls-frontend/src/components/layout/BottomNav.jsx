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
import { LayoutDashboard, FilePlus, ClipboardList } from 'lucide-react';

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
    to: ROUTES.APPLICANT_STATUS,
    icon: <ClipboardList size={22} />,
    label: 'Status',
    id: 'bottom-nav-status',
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
        'bg-[hsl(var(--color-surface-raised))]',
        'border-t border-border',
        'shadow-[0_-2px_8px_rgba(0,0,0,0.06)]',
        'z-[var(--z-sticky)]',
        // Safe area padding for iOS home indicator
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
              'text-xs font-medium',
              'transition-[color,border-color] duration-200 ease-in-out',
              'relative',
              // Active indicator: top border line in accent color
              isActive
                ? [
                    'text-accent',
                    'after:absolute after:top-0 after:left-4 after:right-4',
                    'after:h-0.5 after:rounded-full after:bg-accent',
                  ].join(' ')
                : 'text-[hsl(var(--color-text-muted))] hover:text-[hsl(var(--color-text))]',
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
