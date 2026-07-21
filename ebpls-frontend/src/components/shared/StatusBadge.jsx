// src/components/shared/StatusBadge.jsx

import React from 'react';

/**
 * Clean text-only status badge — no dots, no icons.
 * Just colored text on a subtle background with rounded corners.
 */
const STATUS_CONFIG = {
  'Draft': 'bg-gray-50 text-gray-500',
  'Pending': 'bg-gray-50 text-gray-500',
  'Under Review': 'bg-gray-100 text-gray-600',
  'For Assessment': 'bg-gray-100 text-gray-600',
  'PaymentProcessing': 'bg-gray-100 text-gray-600',
  'Verified': 'bg-gray-200 text-gray-700',
  'Assessed': 'bg-gray-200 text-gray-700',
  'For Payment': 'bg-gray-200 text-gray-700',
  'Paid': 'bg-gray-300 text-gray-800',
  'Completed': 'bg-gray-900 text-white',
  'Issued': 'bg-gray-900 text-white',
  'Returned': 'bg-gray-800 text-gray-200',
  'Payment Failed': 'bg-gray-100 text-gray-400 line-through',
};

const DEFAULT_CONFIG = 'bg-gray-100 text-gray-600';

const StatusBadge = ({ status, size = 'sm', className = '' }) => {
  const configClasses = STATUS_CONFIG[status] || DEFAULT_CONFIG;

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-[11px]',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  };

  return (
    <span
      className={[
        'inline-flex items-center font-semibold rounded-lg',
        configClasses,
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {status === 'PaymentProcessing' ? 'Processing' : status || 'Unknown'}
    </span>
  );
};

export default StatusBadge;
