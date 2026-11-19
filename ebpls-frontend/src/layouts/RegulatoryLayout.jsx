import { Outlet } from 'react-router-dom';
import { ClipboardCheck, LayoutDashboard } from 'lucide-react';
import { Navbar, Sidebar } from '../components/layout';
import { REGULATORY_AGENCIES, ROLES, ROUTES } from '../utils/constants';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/UIStore';

export default function RegulatoryLayout({ agency }) {
  const isSidebarOpen = useUIStore(state => state.isSidebarOpen);
  const role = useAuthStore(state => state.user?.roleName);
  const config = REGULATORY_AGENCIES[agency];
  const items = role === ROLES.ADMIN
    ? Object.values(REGULATORY_AGENCIES).map(office => ({ to: office.route, label: office.label, icon: <ClipboardCheck size={18} /> }))
    : [{ to: config.route, label: 'Inspection queue', icon: <ClipboardCheck size={18} /> }];
  if (role === ROLES.ADMIN) items.unshift({ to: ROUTES.ADMIN_DASHBOARD, label: 'Admin dashboard', icon: <LayoutDashboard size={18} /> });
  return <div className="min-h-screen bg-zinc-50">
    <Navbar portalLabel={config.label} />
    <Sidebar navItems={[{ sectionLabel: 'Regulatory inspections', items }]} />
    <main className={isSidebarOpen ? 'lg:ml-[var(--sidebar-width)]' : ''} style={{ paddingTop: 'var(--navbar-height)' }}>
      <div className="p-4 sm:p-6 lg:p-8"><Outlet /></div>
    </main>
  </div>;
}
