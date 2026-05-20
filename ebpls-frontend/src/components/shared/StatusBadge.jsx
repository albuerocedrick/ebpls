// src/components/shared/StatusBadge.jsx

import React from 'react';

/**
 * Clean text-only status badge — no dots, no icons.
 * Just colored text on a subtle background with rounded corners.
 */
const STATUS_CONFIG = {
  'Draft': { text: 'text-gray-600', bg: 'bg-gray-100' },
  'Pending': { text: 'text-amber-700', bg: 'bg-amber-50' },
  'Under Review': { text: 'text-blue-700', bg: 'bg-blue-50' },
  'Returned': { text: 'text-red-700', bg: 'bg-red-50' },
  'Verified': { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  'For Assessment': { text: 'text-purple-700', bg: 'bg-purple-50' },
  'Assessed': { text: 'text-indigo-700', bg: 'bg-indigo-50' },
  'For Payment': { text: 'text-amber-800', bg: 'bg-amber-50' },
  'PaymentProcessing': { text: 'text-violet-700', bg: 'bg-violet-50', label: 'Processing' },
  'Paid': { text: 'text-teal-700', bg: 'bg-teal-50' },
  'Completed': { text: 'text-green-700', bg: 'bg-green-50' },
};

const DEFAULT_CONFIG = { text: 'text-gray-600', bg: 'bg-gray-100' };

const StatusBadge = ({ status, size = 'sm', className = '' }) => {
  const config = STATUS_CONFIG[status] || DEFAULT_CONFIG;

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-[11px]',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  };

  return (
    <span
      className={[
        'inline-flex items-center font-semibold rounded-lg',
        config.bg,
        config.text,
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {config.label || status || 'Unknown'}
    </span>
  );
};

export default StatusBadge;
