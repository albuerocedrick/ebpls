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
  [APP_STATUS.DRAFT]: { bg: 'bg-gray-50', text: 'text-gray-500', ring: '' },
  [APP_STATUS.PENDING]: { bg: 'bg-gray-50', text: 'text-gray-500', ring: '' },
  [APP_STATUS.UNDER_REVIEW]: { bg: 'bg-gray-100', text: 'text-gray-600', ring: '' },
  [APP_STATUS.RETURNED]: { bg: 'bg-gray-800', text: 'text-gray-200', ring: '' },
  [APP_STATUS.VERIFIED]: { bg: 'bg-gray-200', text: 'text-gray-700', ring: '' },
  [APP_STATUS.FOR_ASSESSMENT]: { bg: 'bg-gray-100', text: 'text-gray-600', ring: '' },
  [APP_STATUS.ASSESSED]: { bg: 'bg-gray-200', text: 'text-gray-700', ring: '' },
  [APP_STATUS.FOR_PAYMENT]: { bg: 'bg-gray-200', text: 'text-gray-700', ring: '' },
  [APP_STATUS.PAID]: { bg: 'bg-gray-300', text: 'text-gray-800', ring: '' },
  [APP_STATUS.COMPLETED]: { bg: 'bg-gray-900', text: 'text-white', ring: '' },
  [APP_STATUS.PAYMENT_PROCESSING]: { bg: 'bg-gray-100', text: 'text-gray-600', ring: '' },
  // Retirements
  [APP_STATUS.RETIREMENT_PENDING]: { bg: 'bg-gray-50', text: 'text-gray-500', ring: '' },
  [APP_STATUS.RETIREMENT_ASSESSED]: { bg: 'bg-gray-200', text: 'text-gray-700', ring: '' },
  [APP_STATUS.RETIREMENT_PAID]: { bg: 'bg-gray-300', text: 'text-gray-800', ring: '' },
  [APP_STATUS.RETIRED]: { bg: 'bg-gray-900', text: 'text-white', ring: '' },
};

// Fallback for unknown statuses
const DEFAULT_STYLE = {
  bg: 'bg-gray-100',
  text: 'text-gray-600',
  ring: '',
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
