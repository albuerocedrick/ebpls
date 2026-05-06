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

import React from 'react';
import { Outlet } from 'react-router-dom';
import { LayoutDashboard, FileSearch } from 'lucide-react';
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
        to: ROUTES.BPLO_VERIFIER.replace('/:appNo', ''),
        icon: <FileSearch size={18} />,
        label: 'Verify Applications',
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
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'hsl(var(--color-surface-bplo))' }}
    >
      <Navbar portalLabel="BPLO Portal" />
      <Sidebar navItems={BPLO_NAV} />

      {/* Content — shifts right when sidebar is open */}
      <main
        id="bplo-content"
        className="transition-[margin-left] duration-300 ease-in-out overflow-x-hidden"
        style={{
          paddingTop: 'var(--navbar-height)',
          marginLeft: isSidebarOpen ? 'var(--sidebar-width)' : '0',
        }}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default BPLOLayout;
