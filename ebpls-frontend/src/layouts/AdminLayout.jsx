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

import { Outlet } from 'react-router-dom';
import { Database, FileText, ScrollText, Mail, Activity, FolderSearch, Users } from 'lucide-react';
import { Navbar, Sidebar } from '../components/layout';
import { ROUTES } from '../utils/constants';
import useUIStore from '../store/UIStore';

// =========================================
// Admin Nav Config — grouped sections
// =========================================

const ADMIN_NAV = [
  {
    sectionLabel: 'Monitor',
    items: [
      {
        to: ROUTES.ADMIN_DASHBOARD,
        icon: <Activity size={18} />,
        label: 'System Health',
      },
    ],
  },
  {
    sectionLabel: 'Operations',
    items: [
      {
        to: ROUTES.ADMIN_APPLICATIONS,
        icon: <FolderSearch size={18} />,
        label: 'Application Explorer',
      },
    ],
  },
  {
    sectionLabel: 'Configuration',
    items: [
      {
        to: ROUTES.ADMIN_USERS,
        icon: <Users size={18} />,
        label: 'User Management',
      },
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
      {
        to: ROUTES.ADMIN_EMAIL_LOGS,
        icon: <Mail size={18} />,
        label: 'Email Logs',
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
    <div className="min-h-screen bg-zinc-50">
      <Navbar portalLabel="Admin Console" />
      <Sidebar navItems={ADMIN_NAV} />

      {/*
        The left offset is applied only from lg up. Below that the sidebar is an
        overlay drawer, so shifting the content as well pushed its left edge off
        screen — which is why admin pages appeared cut off. paddingTop clears the
        fixed navbar.
      */}
      <main
        id="admin-content"
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

export default AdminLayout;
