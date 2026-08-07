/**
 * TreasuryLayout.jsx
 * Light theme layout for Treasury Officers — consistent with the rest of the app.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { ClipboardList, XCircle, Banknote, FileText } from 'lucide-react';
import { Navbar, Sidebar } from '../components/layout';
import { ROUTES } from '../utils/constants';
import useUIStore from '../store/UIStore';

// =========================================
// Treasury Nav Config
// =========================================

const TREASURY_NAV = [
  {
    sectionLabel: 'Treasury',
    items: [
      {
        to: ROUTES.TREASURY_QUEUE,
        icon: <ClipboardList size={18} />,
        label: 'Assessment Queue',
      },

      {
        to: '/treasury/retirements',
        icon: <XCircle size={18} />,
        label: 'Retirements',
      },
      {
        to: ROUTES.TREASURY_FEE_SCHEDULE,
        icon: <FileText size={18} />,
        label: 'Fee Schedule',
      },
    ],
  },
];

// =========================================
// Component
// =========================================

const TreasuryLayout = () => {
  const { isSidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portalLabel="Treasury Portal" />
      <Sidebar navItems={TREASURY_NAV} />

      <main
        id="treasury-content"
        className="transition-[margin-left] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-x-hidden min-h-screen"
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

export default TreasuryLayout;
