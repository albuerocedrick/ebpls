/**
 * Sidebar.jsx
 * Dark sidebar navigation shared by the BPLO, treasury, barangay and admin
 * portals.
 *
 * @policy  Neutral zinc only. The active row is a filled zinc-800 block with a
 *          hairline left marker rather than a translucent white pill, so it
 *          reads at the same weight as the rest of the system.
 * @policy  Section labels are mono uppercase, matching every other eyebrow.
 */

import { NavLink } from 'react-router-dom';
import useUIStore from '../../store/UIStore';
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
        'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm',
        'transition-colors duration-200 ease-out motion-reduce:transition-none',
        'focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2',
        'focus-visible:ring-offset-zinc-950 focus-visible:outline-none',
        active
          ? 'bg-zinc-800 font-medium text-white'
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
        // Hairline marker on the active row, echoing the landing page's rails.
        active
          ? 'before:absolute before:top-2 before:bottom-2 before:-left-3 before:w-px before:bg-white'
          : '',
      ].join(' ');
    }}
  >
    <span className="shrink-0">{icon}</span>
    <span className="truncate">{label}</span>
  </NavLink>
);

// =========================================
// Nav Section
// =========================================

const NavSection = ({ sectionLabel, isFirst = false, children }) => (
  <div className="flex flex-col gap-0.5">
    {sectionLabel && (
      <p
        className={[
          'px-3 pb-2 font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase select-none',
          // The nav already carries top padding, so the first section label must
          // not add its own or the gap under the brand block doubles.
          isFirst ? 'pt-0' : 'pt-6',
        ].join(' ')}
      >
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

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-[39] bg-zinc-950/50 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        aria-label="Navigation sidebar"
        className={[
          'fixed top-0 left-0 h-full',
          panelClassName || 'bg-zinc-950',
          'flex flex-col border-r border-zinc-800',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
        style={{
          width: 'var(--sidebar-width)',
          zIndex: 'var(--z-sticky)',
        }}
      >
        {/* Brand */}
        <div
          className="flex shrink-0 items-center border-b border-zinc-800 px-4"
          style={{ height: 'var(--navbar-height)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center">
              <img src={logo} alt="" aria-hidden="true" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">BOSS</span>
          </div>
        </div>

        {/* Navigation. pt-4 gives the first row breathing room under the brand
            block — previously the first item sat flush against the hairline. */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-4 pb-4">
          {navItems.map((section, idx) => (
            <NavSection key={idx} sectionLabel={section.sectionLabel} isFirst={idx === 0}>
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
          <div className="shrink-0 border-t border-zinc-800 px-3 py-4">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
