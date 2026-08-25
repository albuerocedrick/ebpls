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
 * @policy  Active tab is marked by a zinc-900 icon/label plus a hairline
 *          top indicator — not a filled pill (which would violate the
 *          60-30-10 rule at 100% tab width).
 * @policy  Lucide icons only. Icon size: 22px.
 * @policy  No emojis.
 */

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
        'fixed bottom-0 right-0 left-0',
        'flex items-stretch',
        'bg-white/90 backdrop-blur-xl',
        'border-t border-zinc-200',
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
              'relative flex flex-1 flex-col items-center justify-center gap-1',
              'font-mono text-[10px] tracking-[0.08em] uppercase',
              'transition-colors duration-200 ease-out motion-reduce:transition-none',
              isActive
                ? [
                    'text-zinc-900',
                    'after:absolute after:top-0 after:right-6 after:left-6',
                    'after:h-px after:bg-zinc-900',
                  ].join(' ')
                : 'text-zinc-400 hover:text-zinc-700',
            ].join(' ')
          }
          aria-label={tab.label}
        >
          {({ isActive }) => (
            <>
              <span
                className={[
                  'transition-transform duration-200 ease-out motion-reduce:transition-none',
                  isActive ? 'scale-105' : 'scale-100',
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
