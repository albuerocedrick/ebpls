/**
 * Sidebar.jsx
 * Desktop-first collapsible navigation column.
 * Used by: BPLOLayout, TreasuryLayout, BarangayLayout, AdminLayout.
 *
 * Nav items are injected by the parent layout so this component
 * remains fully role-agnostic.
 *
 * @policy  Width is var(--sidebar-width) = 15rem. Never hardcode it.
 * @policy  Active nav item uses --color-accent-subtle background and
 *          --color-accent text. Not a solid accent fill (would violate 60-30-10).
 * @policy  Icons must be Lucide elements. No emojis.
 * @policy  Sidebar respects isSidebarOpen from UIStore.
 *          On mobile, it renders as an overlay. On desktop, it shifts content.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import useUIStore from '../../store/UIStore';

// =========================================
// Sub-component: Nav Item
// =========================================

/**
 * @param {object} props
 * @param {string} props.to        - React Router path
 * @param {React.ReactElement} props.icon   - Lucide icon element
 * @param {string} props.label
 * @param {Function} [props.onNavigate] - Called after navigation (mobile: close sidebar)
 */
const NavItem = ({ to, icon, label, onNavigate }) => (
  <NavLink
    to={to}
    onClick={onNavigate}
    className={({ isActive }) =>
      [
        'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium',
        'transition-[color,background-color,box-shadow] duration-200 ease-in-out',
        'group',
        isActive
          ? 'bg-[hsl(var(--color-accent-subtle))] text-accent'
          : 'text-[hsl(var(--color-text-muted))] hover:bg-surface-tint hover:text-[hsl(var(--color-text))]',
      ].join(' ')
    }
  >
    <span
      className="shrink-0 transition-transform duration-200 group-hover:scale-110"
      aria-hidden="true"
    >
      {icon}
    </span>
    <span className="truncate">{label}</span>
  </NavLink>
);

// =========================================
// Sub-component: Nav Section
// =========================================

/**
 * Groups nav items under an optional section label.
 * @param {object} props
 * @param {string} [props.sectionLabel]
 * @param {React.ReactNode} props.children
 */
const NavSection = ({ sectionLabel, children }) => (
  <div className="flex flex-col gap-0.5">
    {sectionLabel && (
      <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--color-text-muted))] select-none">
        {sectionLabel}
      </p>
    )}
    {children}
  </div>
);

// =========================================
// Main Sidebar Component
// =========================================

/**
 * @param {object}   props
 * @param {Array}    props.navItems  - Array of nav sections:
 *   [{ sectionLabel?: string, items: [{ to, icon, label }] }]
 * @param {React.ReactNode} [props.footer]  - Optional content pinned to the sidebar bottom
 */
const Sidebar = ({ navItems = [], footer }) => {
  const { isSidebarOpen, closeSidebar } = useUIStore();

  return (
    <>
      {/* Mobile overlay backdrop — closes sidebar on tap */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 lg:hidden"
          style={{ zIndex: 'calc(var(--z-sticky) - 1)' }}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        aria-label="Navigation sidebar"
        className={[
          'fixed top-0 left-0 h-full',
          'bg-[hsl(var(--color-surface-raised))]',
          'border-r border-border shadow-sm',
          'flex flex-col',
          'transition-transform duration-300 ease-in-out',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{
          width: 'var(--sidebar-width)',
          paddingTop: 'var(--navbar-height)',
          zIndex: 'var(--z-sticky)',
        }}
      >
        {/* Scrollable nav area */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {navItems.map((section, idx) => (
            <NavSection key={idx} sectionLabel={section.sectionLabel}>
              {section.items.map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  onNavigate={() => {
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 1024) closeSidebar();
                  }}
                />
              ))}
            </NavSection>
          ))}
        </nav>

        {/* Pinned footer area (e.g. logout button) */}
        {footer && (
          <div className="px-3 py-4 border-t border-border shrink-0">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
