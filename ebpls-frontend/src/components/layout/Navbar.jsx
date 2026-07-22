/**
 * Navbar.jsx
 * Glass-style top navigation bar for desktop-first role layouts.
 */

import React, { useState } from 'react';
import { Bell, Menu, X, LogOut } from 'lucide-react';
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
        className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 lg:px-6 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl z-[var(--z-sticky)]"
        style={{ height: 'var(--navbar-height)' }}
      >
        {/* Left: Toggle + Brand */}
        <div className="flex items-center gap-3">
          {showSidebarToggle && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all lg:hidden"
              aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}

          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-10 h-10 flex items-center justify-center transition-transform hover:scale-105 duration-300">
              <img src={logo} alt="BOSS Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-extrabold text-gray-900 leading-tight tracking-tight">
                BOSS
              </span>
              <span className="text-[10px] font-medium text-gray-400 leading-tight">
                {portalLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 pr-1">
          {/* Notifications */}
          <button
            className="relative w-10 h-10 flex items-center justify-center bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#050505] rounded-full transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} strokeWidth={2} />
            <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-[#E41E3F] rounded-full ring-2 ring-white" />
          </button>

          {/* User Profile */}
          <button className="flex items-center gap-2 p-1 pr-3 bg-transparent hover:bg-gray-100 rounded-full transition-colors">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-black/5">
              <img 
                src="data:image/svg+xml,%3Csvg viewBox='0 0 36 36' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='36' height='36' fill='%23E4E6EB'/%3E%3Cpath d='M18 21.5C14.4101 21.5 11.5 18.5899 11.5 15C11.5 11.4101 14.4101 8.5 18 8.5C21.5899 8.5 24.5 11.4101 24.5 15C24.5 18.5899 21.5899 21.5 18 21.5ZM18 24C23.5228 24 28 28.4772 28 34H8C8 28.4772 12.4772 24 18 24Z' fill='%23BCC0C4'/%3E%3C/svg%3E" 
                alt="Profile" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="hidden sm:flex flex-col text-left pl-1">
              <span className="text-[11px] text-gray-500 font-medium leading-tight">
                {user?.roleName || user?.role || portalLabel}
              </span>
              <span className="text-[14px] font-bold text-[#050505] leading-none mt-0.5">
                {user?.firstName || 'User'}
              </span>
            </div>
          </button>

          {/* Logout — opens confirmation modal */}
          <button
            id="navbar-logout-btn"
            onClick={() => setShowLogoutModal(true)}
            className="relative w-10 h-10 flex items-center justify-center bg-[#E4E6EB] hover:bg-red-100 hover:text-red-600 text-[#050505] rounded-full transition-colors ml-1"
            aria-label="Log out"
            title="Sign out"
          >
            <LogOut size={20} strokeWidth={2} />
          </button>
        </div>
      </header>
    </>
  );
};

export default Navbar;
