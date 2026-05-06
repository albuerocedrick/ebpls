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

import React from 'react';
import { APP_STATUS } from '../../utils/constants';

// =========================================
// Status-to-Token Mapping
// Mirrors the Application State Machine from eBPLS_System_Architecture.md
// =========================================

const STATUS_STYLES = {
  [APP_STATUS.DRAFT]: {
    bg: 'bg-[hsl(var(--color-status-draft-bg))]',
    text: 'text-[hsl(var(--color-status-draft))]',
    ring: 'ring-[hsl(var(--color-status-draft))]',
  },
  [APP_STATUS.PENDING]: {
    bg: 'bg-[hsl(var(--color-status-pending-bg))]',
    text: 'text-[hsl(var(--color-status-pending))]',
    ring: 'ring-[hsl(var(--color-status-pending))]',
  },
  [APP_STATUS.UNDER_REVIEW]: {
    bg: 'bg-[hsl(var(--color-status-under-review-bg))]',
    text: 'text-[hsl(var(--color-status-under-review))]',
    ring: 'ring-[hsl(var(--color-status-under-review))]',
  },
  [APP_STATUS.RETURNED]: {
    bg: 'bg-[hsl(var(--color-status-returned-bg))]',
    text: 'text-[hsl(var(--color-status-returned))]',
    ring: 'ring-[hsl(var(--color-status-returned))]',
  },
  [APP_STATUS.VERIFIED]: {
    bg: 'bg-[hsl(var(--color-status-verified-bg))]',
    text: 'text-[hsl(var(--color-status-verified))]',
    ring: 'ring-[hsl(var(--color-status-verified))]',
  },
  [APP_STATUS.FOR_ASSESSMENT]: {
    bg: 'bg-[hsl(var(--color-status-for-assessment-bg))]',
    text: 'text-[hsl(var(--color-status-for-assessment))]',
    ring: 'ring-[hsl(var(--color-status-for-assessment))]',
  },
  [APP_STATUS.ASSESSED]: {
    bg: 'bg-[hsl(var(--color-status-assessed-bg))]',
    text: 'text-[hsl(var(--color-status-assessed))]',
    ring: 'ring-[hsl(var(--color-status-assessed))]',
  },
  [APP_STATUS.FOR_PAYMENT]: {
    bg: 'bg-[hsl(var(--color-status-for-payment-bg))]',
    text: 'text-[hsl(var(--color-status-for-payment))]',
    ring: 'ring-[hsl(var(--color-status-for-payment))]',
  },
  [APP_STATUS.PAID]: {
    bg: 'bg-[hsl(var(--color-status-paid-bg))]',
    text: 'text-[hsl(var(--color-status-paid))]',
    ring: 'ring-[hsl(var(--color-status-paid))]',
  },
  [APP_STATUS.COMPLETED]: {
    bg: 'bg-[hsl(var(--color-status-completed-bg))]',
    text: 'text-[hsl(var(--color-status-completed))]',
    ring: 'ring-[hsl(var(--color-status-completed))]',
  },
};

// Fallback for unknown statuses
const DEFAULT_STYLE = {
  bg: 'bg-surface-tint',
  text: 'text-[hsl(var(--color-text-muted))]',
  ring: 'ring-border',
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1',
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
        'font-medium rounded-full',
        'leading-none whitespace-nowrap',
        style.bg,
        style.text,
        SIZE_CLASSES[size],
        withRing && `ring-1 ${style.ring}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label || status || 'Unknown'}
    </span>
  );
};

export default Badge;
