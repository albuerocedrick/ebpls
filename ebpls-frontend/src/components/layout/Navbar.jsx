/**
 * Navbar.jsx
 * Top bar for the desktop-first role portals (BPLO, treasury, barangay, admin).
 *
 * @policy  Neutral zinc only.
 * @policy  From lg up the bar starts after the pinned sidebar, so the sidebar's
 *          own brand block is not overlapped by a translucent header.
 */

import { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import useUIStore from '../../store/UIStore';
import useAuthStore from '../../store/authStore';
import useAuth from '../../hooks/useAuth';
import LogoutConfirmModal from '../shared/LogoutConfirmModal';
import logo from '../../assets/logo.png';

const Navbar = ({
  portalLabel = 'BOSS',
  showSidebarToggle = true,
}) => {
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    logout();
  };

  return (
    <>
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutModal(false)}
      />

      <header
        className={[
          'fixed top-0 right-0 left-0 z-[var(--z-sticky)]',
          'flex items-center justify-between px-4 lg:px-6',
          'border-b border-zinc-200 bg-white/90 backdrop-blur-xl',
          'transition-[left] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
          isSidebarOpen ? 'lg:left-[var(--sidebar-width)]' : 'left-0',
        ].join(' ')}
        style={{ height: 'var(--navbar-height)' }}
      >
        {/* Left: toggle + brand (mobile only — the sidebar carries the brand on lg) */}
        <div className="flex items-center gap-3">
          {showSidebarToggle && (
            <button
              onClick={toggleSidebar}
              className="rounded-md p-2 text-zinc-500 transition-colors duration-200 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none motion-reduce:transition-none lg:hidden"
              aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {isSidebarOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          )}

          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center">
              <img src={logo} alt="" aria-hidden="true" className="h-full w-full object-contain" />
            </div>
            <div className="hidden flex-col sm:flex">
              <span className="text-sm font-semibold leading-tight tracking-tight text-zinc-900">
                BOSS
              </span>
              <span className="font-mono text-[10px] leading-tight tracking-[0.08em] text-zinc-500 uppercase">
                {portalLabel}
              </span>
            </div>
          </div>

          {/* On lg the sidebar shows the wordmark, so the bar only needs the
              portal name for orientation. */}
          <span className="hidden font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase lg:block">
            {portalLabel}
          </span>
        </div>

        {/* Right: identity + sign out */}
        <div className="flex items-center gap-2 pr-1">
          <div className="flex items-center gap-2 p-1 pr-3">
            <div className="h-8 w-8 overflow-hidden rounded-full border border-zinc-200">
              <img 
                src="data:image/svg+xml,%3Csvg viewBox='0 0 36 36' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='36' height='36' fill='%23E4E6EB'/%3E%3Cpath d='M18 21.5C14.4101 21.5 11.5 18.5899 11.5 15C11.5 11.4101 14.4101 8.5 18 8.5C21.5899 8.5 24.5 11.4101 24.5 15C24.5 18.5899 21.5899 21.5 18 21.5ZM18 24C23.5228 24 28 28.4772 28 34H8C8 28.4772 12.4772 24 18 24Z' fill='%23BCC0C4'/%3E%3C/svg%3E" 
                alt="Profile" 
                className="h-full w-full object-cover" 
              />
            </div>
            <div className="hidden flex-col pl-1 text-left sm:flex">
              {user?.roleName !== 'Applicant' && user?.role !== 'Applicant' && (
                <span className="text-[11px] leading-tight text-zinc-500 capitalize">
                  {(user?.roleName || user?.role || portalLabel)?.replace(/_/g, ' ')}
                </span>
              )}
              <span className="mt-0.5 max-w-[220px] truncate text-[13px] font-medium leading-none text-zinc-900" title={user?.email}>
                {user?.email || 'User'}
              </span>
            </div>
          </div>

          <button
            id="navbar-logout-btn"
            onClick={() => setShowLogoutModal(true)}
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors duration-200 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
            aria-label="Log out"
            title="Sign out"
          >
            <LogOut size={17} strokeWidth={2} />
          </button>
        </div>
      </header>
    </>
  );
};

export default Navbar;
