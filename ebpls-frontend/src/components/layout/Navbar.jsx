/**
 * Navbar.jsx
 * Top navigation bar for desktop-first role layouts.
 * Used by: BPLOLayout, TreasuryLayout, BarangayLayout, AdminLayout.
 *
 * ApplicantLayout uses BottomNav instead — this Navbar is simplified for
 * desktop contexts (no bottom tabs needed).
 *
 * @policy  All icon usage via lucide-react. No emojis.
 * @policy  Height fixed at var(--navbar-height) = 3.5rem so layouts
 *          can offset their content area reliably.
 * @policy  The brand mark uses the accent token for the color dot only (10% rule).
 */

import React from 'react';
import { Bell, ChevronDown, Menu, X } from 'lucide-react';
import useUIStore from '../../store/UIStore';
import Button from '../ui/Button';

// =========================================
// Component
// =========================================

/**
 * @param {object}  props
 * @param {string}  props.portalLabel   - Role label shown next to the logo (e.g. "BPLO Portal")
 * @param {object}  [props.user]        - { name, role } from authStore (Phase 2)
 * @param {boolean} [props.showSidebarToggle=true]
 */
const Navbar = ({
  portalLabel = 'eBPLS',
  user = null,
  showSidebarToggle = true,
}) => {
  const { isSidebarOpen, toggleSidebar } = useUIStore();

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0',
        'flex items-center justify-between',
        'px-4 border-b border-border',
        'bg-[hsl(var(--color-surface-raised))]',
        'shadow-sm z-[var(--z-sticky)]',
      ].join(' ')}
      style={{ height: 'var(--navbar-height)' }}
    >
      {/* Left: Sidebar toggle + brand */}
      <div className="flex items-center gap-3">
        {showSidebarToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            className="!p-2"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </Button>
        )}

        <div className="flex items-center gap-2">
          {/* Brand accent dot — 10% accent rule, not a rainbow */}
          <span
            className="w-2.5 h-2.5 rounded-full bg-accent shrink-0"
            aria-hidden="true"
          />
          <span className="font-semibold text-sm text-[hsl(var(--color-text))] leading-none">
            eBPLS
          </span>
          <span
            className="text-xs text-[hsl(var(--color-text-muted))] leading-none hidden sm:block"
            aria-label={`Current portal: ${portalLabel}`}
          >
            / {portalLabel}
          </span>
        </div>
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-1">
        {/* Notifications — wired in Phase 2 */}
        <Button
          variant="ghost"
          size="sm"
          aria-label="Notifications"
          className="!p-2 relative"
        >
          <Bell size={18} />
          {/* Notification dot placeholder */}
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent"
          />
        </Button>

        {/* User chip */}
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 !px-2"
          aria-label="User menu"
        >
          {/* Avatar placeholder — replaced with real avatar in Phase 2 */}
          <span
            className="w-7 h-7 rounded-full bg-[hsl(var(--color-accent-subtle))] text-accent flex items-center justify-center text-xs font-semibold shrink-0"
            aria-hidden="true"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </span>
          <span className="text-sm font-medium text-[hsl(var(--color-text))] hidden md:block max-w-[120px] truncate">
            {user?.name || 'Guest'}
          </span>
          <ChevronDown size={14} className="text-[hsl(var(--color-text-muted))] hidden md:block shrink-0" />
        </Button>
      </div>
    </header>
  );
};

export default Navbar;
