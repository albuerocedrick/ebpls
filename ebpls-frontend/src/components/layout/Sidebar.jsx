/**
 * Sidebar.jsx
 * Dark sidebar navigation — matches the reference design.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import useUIStore from '../../store/UIStore';
import useAuthStore from '../../store/authStore';
import logo from '../../assets/logo.png';

// =========================================
// Nav Item
// =========================================

const NavItem = ({ to, icon, label, end = false, isActive: customIsActive, onNavigate }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onNavigate}
    className={(navLinkProps) => {
      const active = customIsActive ? customIsActive(navLinkProps) : navLinkProps.isActive;
      return [
        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium',
        'transition-all duration-200',
        'group',
        active
          ? 'bg-white/10 text-white'
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200',
      ].join(' ');
    }}
  >
    <span className="shrink-0 text-lg opacity-70 group-hover:opacity-100 transition-opacity">
      {icon}
    </span>
    <span className="truncate">{label}</span>
  </NavLink>
);

// =========================================
// Nav Section
// =========================================

const NavSection = ({ sectionLabel, children }) => (
  <div className="flex flex-col gap-0.5">
    {sectionLabel && (
      <p className="px-4 pt-6 pb-2 text-[0.6rem] font-bold text-gray-500 uppercase tracking-[0.15em] select-none">
        {sectionLabel}
      </p>
    )}
    {children}
  </div>
);

// =========================================
// Main Sidebar
// =========================================

const Sidebar = ({ navItems = [], footer, panelClassName = '' }) => {
  const { isSidebarOpen, closeSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm lg:hidden z-[39]"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        aria-label="Navigation sidebar"
        className={[
          'fixed top-0 left-0 h-full',
          panelClassName || 'bg-gray-900',
          'flex flex-col',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
        style={{
          width: 'var(--sidebar-width)',
          zIndex: 'var(--z-sticky)',
        }}
      >
        {/* Brand Logo Section */}
        <div className="p-5 pb-4 lg:pl-6 border-b border-gray-800/50 flex items-center justify-center lg:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 flex items-center justify-center drop-shadow-sm">
              <img src={logo} alt="BOSS Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-wide">BOSS</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {navItems.map((section, idx) => (
            <NavSection key={idx} sectionLabel={section.sectionLabel}>
              {section.items.map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  end={item.end}
                  isActive={item.isActive}
                  onNavigate={() => {
                    if (window.innerWidth < 1024) closeSidebar();
                  }}
                />
              ))}
            </NavSection>
          ))}
        </nav>

        {/* Footer */}
        {footer && (
          <div className="px-3 py-4 border-t border-gray-800 shrink-0">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
