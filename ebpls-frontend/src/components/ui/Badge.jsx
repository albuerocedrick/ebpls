/**
 * Badge.jsx
 * Pill-shaped status indicator component.
 *
 * Variants are mapped directly to the application state machine statuses
 * defined in constants.js, ensuring visual consistency across all modules.
 *
 * @policy  No emojis. Icons from lucide-react only if needed.
 * @policy  All colors from CSS token variables.
 * @policy  Text must be legible — foreground/background pairs are pre-validated.
 */

import { APP_STATUS } from '../../utils/constants';

// =========================================
// Status-to-Token Mapping
// Mirrors the Application State Machine from eBPLS_System_Architecture.md
// =========================================

const STATUS_STYLES = {
  [APP_STATUS.DRAFT]: { bg: 'bg-surface', text: 'text-zinc-500', ring: 'ring-zinc-200' },
  [APP_STATUS.PENDING]: { bg: 'bg-surface', text: 'text-zinc-500', ring: 'ring-zinc-200' },
  [APP_STATUS.UNDER_REVIEW]: { bg: 'bg-zinc-100', text: 'text-zinc-600', ring: 'ring-zinc-200' },
  [APP_STATUS.RETURNED]: { bg: 'bg-zinc-800', text: 'text-zinc-100', ring: 'ring-zinc-800' },
  [APP_STATUS.VERIFIED]: { bg: 'bg-zinc-200', text: 'text-zinc-700', ring: 'ring-zinc-300' },
  [APP_STATUS.FOR_ASSESSMENT]: { bg: 'bg-zinc-100', text: 'text-zinc-600', ring: 'ring-zinc-200' },
  [APP_STATUS.ASSESSED]: { bg: 'bg-zinc-200', text: 'text-zinc-700', ring: 'ring-zinc-300' },
  [APP_STATUS.FOR_PAYMENT]: { bg: 'bg-zinc-200', text: 'text-zinc-700', ring: 'ring-zinc-300' },
  [APP_STATUS.PAID]: { bg: 'bg-zinc-300', text: 'text-zinc-800', ring: 'ring-zinc-400' },
  [APP_STATUS.COMPLETED]: { bg: 'bg-zinc-900', text: 'text-white', ring: 'ring-zinc-900' },
  [APP_STATUS.PAYMENT_PROCESSING]: { bg: 'bg-zinc-100', text: 'text-zinc-600', ring: 'ring-zinc-200' },
  // Retirements
  [APP_STATUS.RETIREMENT_PENDING]: { bg: 'bg-surface', text: 'text-zinc-500', ring: 'ring-zinc-200' },
  [APP_STATUS.RETIREMENT_ASSESSED]: { bg: 'bg-zinc-200', text: 'text-zinc-700', ring: 'ring-zinc-300' },
  [APP_STATUS.RETIREMENT_PAID]: { bg: 'bg-zinc-300', text: 'text-zinc-800', ring: 'ring-zinc-400' },
  [APP_STATUS.RETIRED]: { bg: 'bg-zinc-900', text: 'text-white', ring: 'ring-zinc-900' },
};

// Fallback for unknown statuses
const DEFAULT_STYLE = {
  bg: 'bg-zinc-100',
  text: 'text-zinc-600',
  ring: 'ring-zinc-200',
};

const SIZE_CLASSES = {
  sm: 'text-[10px] px-2 py-0.5 tracking-[0.08em]',
  md: 'text-[10px] px-2.5 py-1 tracking-[0.1em]',
  lg: 'text-xs px-3 py-1.5 tracking-[0.1em]',
};

// =========================================
// Component
// =========================================

/**
 * @param {object}  props
 * @param {string}  [props.status]     - An APP_STATUS value. Drives automatic color.
 * @param {string}  [props.label]      - Override display text. Defaults to `status`.
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.withRing=false] - Adds a 1px ring for contrast on white backgrounds
 * @param {string}  [props.className]
 */
const Badge = ({
  status,
  label,
  size = 'md',
  withRing = false,
  className = '',
}) => {
  const style = STATUS_STYLES[status] || DEFAULT_STYLE;

  return (
    <span
      className={[
        'inline-flex items-center justify-center',
        // Mono uppercase, matching the eyebrow and caption treatment used on
        // the public pages. A status is a label, not prose.
        'font-mono uppercase rounded-full',
        'leading-none whitespace-nowrap',
        style.bg,
        style.text,
        SIZE_CLASSES[size],
        withRing && style.ring && `ring-1 ${style.ring}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label || (status === APP_STATUS.PAYMENT_PROCESSING ? 'Payment Processing' : status) || 'Unknown'}
    </span>
  );
};

export default Badge;
