/**
 * BarangayLayout.jsx
 * Desktop-first layout for Barangay Officers.
 *
 * Structure:
 *   - Top: Navbar
 *   - Left: Sidebar (single nav item — Clearance Queue)
 *   - Right: Main content (<Outlet />)
 *
 * @policy  Canvas uses --color-surface-barangay (slight green bias)
 *          to orient users within the Barangay portal.
 * @policy  DESKTOP-FIRST. Single-purpose portal — minimal navigation.
 */

import { Outlet } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { Navbar, Sidebar } from '../components/layout';
import { ROUTES } from '../utils/constants';
import useUIStore from '../store/UIStore';

// =========================================
// Barangay Nav Config
// =========================================

const BARANGAY_NAV = [
  {
    items: [
      {
        to: ROUTES.BARANGAY_QUEUE,
        icon: <ClipboardCheck size={18} />,
        label: 'Clearance Queue',
      },
    ],
  },
];

// =========================================
// Component
// =========================================

const BarangayLayout = () => {
  const { isSidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar portalLabel="Barangay Portal" />
      <Sidebar navItems={BARANGAY_NAV} />

      {/* Content — offset only from lg up, where the sidebar is pinned rather
          than an overlay drawer. */}
      <main
        id="barangay-content"
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

export default BarangayLayout;
