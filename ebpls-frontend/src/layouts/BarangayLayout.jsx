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

import React from 'react';
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
    <div
      className="min-h-screen bg-gray-50"
    >
      <Navbar portalLabel="Barangay Portal" />
      <Sidebar navItems={BARANGAY_NAV} />

      <main
        id="barangay-content"
        className="transition-[margin-left] duration-300 ease-in-out overflow-x-hidden"
        style={{
          paddingTop: 'var(--navbar-height)',
          marginLeft: isSidebarOpen ? 'var(--sidebar-width)' : '0',
        }}
      >
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default BarangayLayout;
