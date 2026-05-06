/**
 * AdminLayout.jsx
 * Utilitarian desktop-first layout for System Administrators.
 *
 * Structure:
 *   - Top: Navbar
 *   - Left: Sidebar (3 nav sections: Config, Compliance)
 *   - Right: Main content (<Outlet />)
 *
 * @policy  DESKTOP-FIRST. Admin is a power-user portal — information density
 *          is acceptable and expected. No mobile-first padding here.
 * @policy  Canvas uses neutral --color-surface-admin.
 * @policy  The sidebar has grouped sections (Config and Compliance) to
 *          distinguish between data management and audit functions.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Database, FileText, ScrollText } from 'lucide-react';
import { Navbar, Sidebar } from '../components/layout';
import { ROUTES } from '../utils/constants';
import useUIStore from '../store/UIStore';

// =========================================
// Admin Nav Config — grouped sections
// =========================================

const ADMIN_NAV = [
  {
    sectionLabel: 'Configuration',
    items: [
      {
        to: ROUTES.ADMIN_MASTER_DATA,
        icon: <Database size={18} />,
        label: 'Master Data',
      },
      {
        to: ROUTES.ADMIN_DOCUMENT_BUILDER,
        icon: <FileText size={18} />,
        label: 'Document Builder',
      },
    ],
  },
  {
    sectionLabel: 'Compliance',
    items: [
      {
        to: ROUTES.ADMIN_AUDIT_LOGS,
        icon: <ScrollText size={18} />,
        label: 'Audit Logs',
      },
    ],
  },
];

// =========================================
// Component
// =========================================

const AdminLayout = () => {
  const { isSidebarOpen } = useUIStore();

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'hsl(var(--color-surface-admin))' }}
    >
      <Navbar portalLabel="Admin Console" />
      <Sidebar navItems={ADMIN_NAV} />

      <main
        id="admin-content"
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

export default AdminLayout;
