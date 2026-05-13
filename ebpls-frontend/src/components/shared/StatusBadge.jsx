// src/components/shared/StatusBadge.jsx

import React from 'react';
import { 
  FileEdit, 
  Clock, 
  Search, 
  AlertCircle, 
  ShieldCheck, 
  Calculator, 
  FileCheck, 
  Banknote, 
  Receipt, 
  CheckCircle2,
  HelpCircle,
  Loader2 // Added for Phase 5
} from 'lucide-react';

/**
 * Maps the strict application_status enum from the database 
 * to specific visual tokens and icons.
 */
const STATUS_CONFIG = {
  'Draft': {
    icon: FileEdit,
    classes: 'bg-gray-50 text-gray-700 border-gray-200',
  },
  'Pending': {
    icon: Clock,
    classes: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  'Under Review': {
    icon: Search,
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  'Returned': {
    icon: AlertCircle,
    classes: 'bg-red-50 text-red-700 border-red-200',
  },
  'Verified': {
    icon: ShieldCheck,
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  'For Assessment': {
    icon: Calculator,
    classes: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  'Assessed': {
    icon: FileCheck,
    classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  'For Payment': {
    icon: Banknote,
    classes: 'bg-amber-50 text-amber-800 border-amber-300',
  },
  // Added for Phase 5: Payment Processing
  'PaymentProcessing': {
    icon: Loader2,
    classes: 'bg-violet-50 text-violet-700 border-violet-200',
    label: 'Payment Processing',
    animate: true
  },
  'Paid': {
    icon: Receipt,
    classes: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  'Completed': {
    icon: CheckCircle2,
    classes: 'bg-green-100 text-green-800 border-green-300',
  }
};

const DEFAULT_CONFIG = {
  icon: HelpCircle,
  classes: 'bg-gray-100 text-gray-600 border-gray-300',
};

const StatusBadge = ({ status, size = 'sm', className = '' }) => {
  const config = STATUS_CONFIG[status] || DEFAULT_CONFIG;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;

  return (
    <div 
      className={`
        inline-flex items-center font-medium rounded-full border
        ${config.classes} 
        ${sizeClasses[size]} 
        ${className}
      `}
      title={`Status: ${status}`}
    >
      <Icon 
        size={iconSize} 
        strokeWidth={2.5} 
        className={config.animate ? 'animate-spin' : ''} 
      />
      <span>{config.label || status || 'Unknown'}</span>
    </div>
  );
};

export default StatusBadge;