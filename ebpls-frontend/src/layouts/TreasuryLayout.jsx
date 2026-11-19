/**
 * TreasuryLayout.jsx
 * Light theme layout for Treasury Officers — consistent with the rest of the app.
 */

import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ClipboardList, XCircle, FileText, Receipt } from 'lucide-react';
import { Navbar, Sidebar } from '../components/layout';
import { ROUTES } from '../utils/constants';
import useUIStore from '../store/UIStore';
import apiClient from '../utils/apiClient';

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
      { to: ROUTES.TREASURY_VERIFY_PAYMENTS, label: 'Payment Verification', icon: <Receipt size={18} /> },

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
  const [proofCount, setProofCount] = useState(null);
  useEffect(() => {
    let active = true;
    let inFlight = false;
    async function refresh() {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await apiClient.get('/api/treasury/payments/pending-proofs/count');
        if (active) setProofCount(response.data.count);
      } catch {
        if (active) setProofCount(null);
      } finally { inFlight = false; }
    }
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => { active = false; clearInterval(interval); };
  }, []);
  const navItems = TREASURY_NAV.map(section => ({ ...section, items: section.items.map(item =>
    item.to === ROUTES.TREASURY_VERIFY_PAYMENTS ? { ...item, badge: proofCount } : item),
  }));

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar portalLabel="Treasury Portal" />
      <Sidebar navItems={navItems} />

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
          <Outlet context={setProofCount} />
        </div>
      </main>
    </div>
  );
};

export default TreasuryLayout;
