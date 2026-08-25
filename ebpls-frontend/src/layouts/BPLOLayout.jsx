/**
 * BPLOLayout.jsx
 * Desktop-first dashboard layout for BPLO Officers.
 *
 * Structure:
 *   - Top: Navbar (with sidebar toggle)
 *   - Left: Sidebar (pushed in/out via UIStore)
 *   - Right: Main content area (<Outlet />)
 *
 * @policy  DESKTOP-FIRST. Sidebar is open by default on desktop.
 * @policy  Content area must shift right by --sidebar-width when sidebar is open,
 *          using a smooth CSS transition to match the sidebar animation.
 * @policy  Canvas is neutral --color-surface-bplo.
 */

import { Outlet } from 'react-router-dom';
import { LayoutDashboard, XCircle, CheckCircle2 } from 'lucide-react';
import { Navbar, Sidebar } from '../components/layout';
import { ROUTES } from '../utils/constants';
import useUIStore from '../store/UIStore';

// =========================================
// BPLO Nav Config (injected into Sidebar)
// =========================================

const BPLO_NAV = [
  {
    items: [
      {
        to: ROUTES.BPLO_DASHBOARD,
        icon: <LayoutDashboard size={18} />,
        label: 'Dashboard',
      },

      {
        to: ROUTES.BPLO_RETIREMENTS,
        icon: <XCircle size={18} />,
        label: 'Retirements',
      },
      {
        to: ROUTES.BPLO_COMPLETED,
        icon: <CheckCircle2 size={18} />,
        label: 'Completed',
      },
    ],
  },
];

// =========================================
// Component
// =========================================

const BPLOLayout = () => {
  const { isSidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar portalLabel="BPLO Portal" />
      <Sidebar navItems={BPLO_NAV} />

      {/* Content — offset only from lg up, where the sidebar is pinned rather
          than an overlay drawer. */}
      <main
        id="bplo-content"
        className={[
          'min-h-screen overflow-x-hidden',
          'transition-[margin-left] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
          isSidebarOpen ? 'lg:ml-[var(--sidebar-width)]' : 'ml-0',
        ].join(' ')}
        style={{ paddingTop: 'var(--navbar-height)' }}
      >
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default BPLOLayout;
