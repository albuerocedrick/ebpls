/**
 * TreasuryLayout.jsx
 * Light theme layout for Treasury Officers — consistent with the rest of the app.
 */

import { Outlet } from 'react-router-dom';
import { ClipboardList, XCircle, FileText } from 'lucide-react';
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
    <div className="min-h-screen bg-zinc-50">
      <Navbar portalLabel="Treasury Portal" />
      <Sidebar navItems={TREASURY_NAV} />

      {/* Content — offset only from lg up, where the sidebar is pinned rather
          than an overlay drawer. */}
      <main
        id="treasury-content"
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

export default TreasuryLayout;
