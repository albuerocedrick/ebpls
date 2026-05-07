/**
 * ToastContainer.jsx
 * Renders the global toast notification stack.
 * Reads from UIStore.toasts — auto-dismiss is handled by UIStore.addToast().
 *
 * @policy  Lucide icons only — no emoji.
 * @policy  All colors from CSS tokens — no inline color values.
 * @policy  CSS transitions on enter/exit — no abrupt appearance.
 * @policy  Fixed bottom-right, z-index: var(--z-toast) = 500.
 */

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

import useUIStore, { TOAST_TYPE } from '../../store/UIStore';

// =========================================
// Per-type config: icon + CSS token names
// =========================================
const TOAST_CONFIG = {
  [TOAST_TYPE.SUCCESS]: {
    Icon: CheckCircle2,
    colorVar: '--color-success',
    bgVar: '--color-success-bg',
  },
  [TOAST_TYPE.ERROR]: {
    Icon: XCircle,
    colorVar: '--color-error',
    bgVar: '--color-error-bg',
  },
  [TOAST_TYPE.WARNING]: {
    Icon: AlertTriangle,
    colorVar: '--color-warning',
    bgVar: '--color-warning-bg',
  },
  [TOAST_TYPE.INFO]: {
    Icon: Info,
    colorVar: '--color-info',
    bgVar: '--color-info-bg',
  },
};

// =========================================
// ToastItem — single animated notification
// =========================================
function ToastItem({ id, message, type }) {
  const removeToast = useUIStore((s) => s.removeToast);
  const [visible, setVisible] = useState(false);

  const config = TOAST_CONFIG[type] ?? TOAST_CONFIG[TOAST_TYPE.INFO];
  const { Icon } = config;

  // Trigger the slide-in on mount (next paint cycle).
  useEffect(() => {
    const frameId = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frameId);
  }, []);

  function handleDismiss() {
    // Slide out first, then remove from store after transition.
    setVisible(false);
    setTimeout(() => removeToast(id), 220);
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-raised)',
        backgroundColor: `hsl(var(${config.bgVar}))`,
        color: `hsl(var(${config.colorVar}))`,
        border: `1px solid hsl(var(${config.colorVar}) / 0.25)`,
        minWidth: '18rem',
        maxWidth: '24rem',
        // Slide in from the right
        transform: visible ? 'translateX(0)' : 'translateX(110%)',
        opacity: visible ? 1 : 0,
        transition: `transform var(--transition-base), opacity var(--transition-base)`,
        pointerEvents: 'auto',
      }}
    >
      {/* Type icon */}
      <Icon size={18} style={{ flexShrink: 0, marginTop: '1px' }} />

      {/* Message */}
      <span
        style={{
          flex: 1,
          fontSize: '0.875rem',
          lineHeight: '1.4',
          color: `hsl(var(${config.colorVar}))`,
          fontWeight: '500',
        }}
      >
        {message}
      </span>

      {/* Close button */}
      <button
        aria-label="Dismiss notification"
        onClick={handleDismiss}
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0',
          color: `hsl(var(${config.colorVar}) / 0.7)`,
          display: 'flex',
          alignItems: 'center',
          transition: `color var(--transition-fast)`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = `hsl(var(${config.colorVar}))`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = `hsl(var(${config.colorVar}) / 0.7)`;
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

// =========================================
// ToastContainer — fixed viewport anchor
// =========================================
function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);

  // Show max 5 toasts to prevent overflow on small screens.
  const visible = toasts.slice(-5);

  return (
    <div
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: 'var(--space-6)',
        right: 'var(--space-6)',
        zIndex: 'var(--z-toast)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        alignItems: 'flex-end',
        pointerEvents: 'none',   // Container is click-through; items restore pointer-events.
      }}
    >
      {visible.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
        />
      ))}
    </div>
  );
}

export default ToastContainer;
