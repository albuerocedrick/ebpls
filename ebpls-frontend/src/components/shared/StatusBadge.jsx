// src/components/shared/StatusBadge.jsx

/**
 * Text-only status badge — no dots, no icons.
 *
 * @policy  Neutral zinc ramp only. Progression is encoded by weight
 *          (light fill → dark fill), not by hue, so the badge never
 *          becomes the only saturated element on a screen.
 */
const STATUS_CONFIG = {
  'Draft': 'bg-zinc-50 text-zinc-500 ring-1 ring-zinc-200',
  'Pending': 'bg-zinc-50 text-zinc-500 ring-1 ring-zinc-200',
  'Under Review': 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200',
  'For Assessment': 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200',
  'PaymentProcessing': 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200',
  'Verified': 'bg-zinc-200 text-zinc-700 ring-1 ring-zinc-300',
  'Assessed': 'bg-zinc-200 text-zinc-700 ring-1 ring-zinc-300',
  'For Payment': 'bg-zinc-200 text-zinc-700 ring-1 ring-zinc-300',
  'Paid': 'bg-zinc-300 text-zinc-800 ring-1 ring-zinc-400',
  'Completed': 'bg-zinc-900 text-white',
  'Issued': 'bg-zinc-900 text-white',
  'Returned': 'bg-zinc-800 text-zinc-100',
  'Payment Failed': 'bg-zinc-100 text-zinc-400 line-through ring-1 ring-zinc-200',
};

const DEFAULT_CONFIG = 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200';

const StatusBadge = ({ status, size = 'sm', className = '' }) => {
  const configClasses = STATUS_CONFIG[status] || DEFAULT_CONFIG;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-[11px]',
    lg: 'px-3 py-1 text-xs',
  };

  return (
    <span
      className={[
        'inline-flex items-center rounded-md font-mono tracking-[0.08em] uppercase',
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
