/**
 * Navbar.jsx
 * Glass-style top navigation bar for desktop-first role layouts.
 */

import React from 'react';
import { Bell, Menu, X, LogOut, Building2 } from 'lucide-react';
import useUIStore from '../../store/UIStore';
import useAuthStore from '../../store/authStore';
import useAuth from '../../hooks/useAuth';

const Navbar = ({
  portalLabel = 'eBPLS',
  showSidebarToggle = true,
}) => {
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();

  return (
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

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm">
            <Building2 size={16} className="text-white" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-extrabold text-gray-900 leading-tight tracking-tight">
              eBPLS
            </span>
            <span className="text-[10px] font-medium text-gray-400 leading-tight">
              {portalLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        {/* Notifications */}
        <button
          className="relative p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
          aria-label="Notifications"
        >
          <Bell size={18} strokeWidth={2} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>

        {/* Divider */}
        <div className="hidden sm:block h-6 w-px bg-gray-200 mx-1.5" />

        {/* User */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-900 flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-bold">
              {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
            </span>
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-semibold text-gray-900 leading-tight max-w-[100px] truncate">
              {user?.firstName || 'Guest'}
            </span>
            <span className="text-[10px] text-gray-400 leading-tight">
              {user?.role || portalLabel}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all ml-1"
          aria-label="Log out"
        >
          <LogOut size={17} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
