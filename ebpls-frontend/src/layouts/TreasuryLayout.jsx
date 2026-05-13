/**
 * TreasuryLayout.jsx
 * High-contrast Desktop POS-style layout for Treasury Officers.
 *
 * Structure:
 *   - Top: Navbar (dark variant — uses treasury-specific overrides)
 *   - Left: Sidebar (dark POS panel)
 *   - Right: Main content area — dark canvas (<Outlet />)
 *
 * @policy  DESKTOP POS — HIGH CONTRAST. The entire canvas is dark
 *          (--color-surface-treasury). Text must be --color-text-inverse.
 * @policy  This is the ONE layout allowed to override the global
 *          light-mode canvas. treasury-canvas utility class from index.css
 *          controls this override.
 * @policy  Typography inside this layout must be large and readable for
 *          cashier use. Individual screen components are responsible for
 *          enforcing large text sizes.
 * @policy  No decorative imagery or gradients inside this layout.
 *          Clarity and speed of reading are the only design priorities.
 */

import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Calculator, Banknote, LogOut, ClipboardList } from 'lucide-react';
import { Sidebar } from '../components/layout';
import { ROUTES } from '../utils/constants';
import useUIStore from '../store/UIStore';
import useAuthStore from '../store/authStore';
import useAuth from '../hooks/useAuth';

// =========================================
// Treasury Nav Config
// =========================================

const TREASURY_NAV = [
  {
    items: [
      {
        to: ROUTES.TREASURY_QUEUE,
        icon: <ClipboardList size={18} />,
        label: 'Assessment Queue',
        // Keep active for all treasury sub-routes (assess, cashier, etc.)
        isActive: () => window.location.pathname.startsWith('/treasury'),
      },
    ],
  },
];

// =========================================
// Dark Navbar — Treasury specific
// (Inline because TreasuryLayout overrides global surface tokens)
// =========================================

const TreasuryNavbar = () => {
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 border-b z-[var(--z-sticky)]"
      style={{
        height: 'var(--navbar-height)',
        backgroundColor: 'hsl(var(--color-surface-treasury-panel))',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-200"
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <span className="block w-4.5 h-0.5 bg-current mb-1 rounded" />
          <span className="block w-4.5 h-0.5 bg-current mb-1 rounded" />
          <span className="block w-4.5 h-0.5 bg-current rounded" />
        </button>
        <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
        <span className="font-semibold text-sm text-white leading-none">eBPLS</span>
        <span className="text-xs text-white/50 hidden sm:block">/ Treasury</span>
      </div>
      
      <div className="flex items-center gap-4">
        <span className="text-xs font-mono text-white/40 hidden md:block">
          OTC ONLY — CASH & MANAGER CHECK
        </span>
        <div className="h-4 w-[1px] bg-white/20 hidden md:block"></div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-[hsl(var(--color-error))] hover:text-red-400 transition-colors"
          aria-label="Log out"
        >
          <LogOut size={16} />
          <span className="text-sm font-medium hidden sm:block">LogOut</span>
        </button>
      </div>
    </header>
  );
};

// =========================================
// Component
// =========================================

const TreasuryLayout = () => {
  const { isSidebarOpen } = useUIStore();

  return (
    <div
      className="min-h-screen treasury-canvas"
    >
      <TreasuryNavbar />

      <Sidebar
        navItems={TREASURY_NAV}
        panelClassName="bg-[hsl(var(--color-surface-treasury-panel))]"
      />

      {/* Main content area */}
      <main
        id="treasury-content"
        className="transition-[margin-left] duration-300 ease-in-out treasury-canvas min-h-screen"
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

export default TreasuryLayout;
