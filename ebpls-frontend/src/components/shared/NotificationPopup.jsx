import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import useNotificationStore from '../../store/notificationStore';

const TYPE_CONFIG = {
  APPLICATION_UNDER_REVIEW: { 
    icon: '🔍', 
    colors: {
      borderOuter: 'border-blue-100',
      headerBg: 'bg-blue-50',
      headerBorder: 'border-blue-100',
      textPrimary: 'text-blue-700',
      closeBtn: 'text-blue-400 hover:text-blue-700 hover:bg-blue-100',
      actionBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
    }
  },
  APPLICATION_VERIFIED: { 
    icon: '✅', 
    colors: {
      borderOuter: 'border-green-100',
      headerBg: 'bg-green-50',
      headerBorder: 'border-green-100',
      textPrimary: 'text-green-700',
      closeBtn: 'text-green-400 hover:text-green-700 hover:bg-green-100',
      actionBtn: 'bg-green-600 hover:bg-green-700 text-white',
    }
  },
  APPLICATION_ASSESSED: { 
    icon: '📋', 
    colors: {
      borderOuter: 'border-orange-100',
      headerBg: 'bg-orange-50',
      headerBorder: 'border-orange-100',
      textPrimary: 'text-orange-700',
      closeBtn: 'text-orange-400 hover:text-orange-700 hover:bg-orange-100',
      actionBtn: 'bg-orange-600 hover:bg-orange-700 text-white',
    }
  },
  PAYMENT_CONFIRMED: { 
    icon: '💳', 
    colors: {
      borderOuter: 'border-emerald-100',
      headerBg: 'bg-emerald-50',
      headerBorder: 'border-emerald-100',
      textPrimary: 'text-emerald-700',
      closeBtn: 'text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100',
      actionBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    }
  },
  APPLICATION_RETURNED: { 
    icon: '⚠️', 
    colors: {
      borderOuter: 'border-red-100',
      headerBg: 'bg-red-50',
      headerBorder: 'border-red-100',
      textPrimary: 'text-red-700',
      closeBtn: 'text-red-400 hover:text-red-700 hover:bg-red-100',
      actionBtn: 'bg-red-600 hover:bg-red-700 text-white',
    }
  },
  CERT_READY: { 
    icon: '📄', 
    colors: {
      borderOuter: 'border-green-100',
      headerBg: 'bg-green-50',
      headerBorder: 'border-green-100',
      textPrimary: 'text-green-700',
      closeBtn: 'text-green-400 hover:text-green-700 hover:bg-green-100',
      actionBtn: 'bg-green-600 hover:bg-green-700 text-white',
    }
  },
};

const DEFAULT_CONFIG = { 
  icon: '📢', 
  colors: {
    borderOuter: 'border-gray-200',
    headerBg: 'bg-gray-100',
    headerBorder: 'border-gray-200',
    textPrimary: 'text-gray-700',
    closeBtn: 'text-gray-400 hover:text-gray-700 hover:bg-gray-200',
    actionBtn: 'bg-gray-800 hover:bg-gray-900 text-white',
  }
};

const timeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `${interval} year${interval === 1 ? '' : 's'} ago`;
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `${interval} month${interval === 1 ? '' : 's'} ago`;
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval} day${interval === 1 ? '' : 's'} ago`;
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval} hour${interval === 1 ? '' : 's'} ago`;
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval} minute${interval === 1 ? '' : 's'} ago`;
  return seconds < 30 ? 'just now' : `${Math.max(0, Math.floor(seconds))} seconds ago`;
};

const NotificationPopup = () => {
  const { notifications, newNotificationIds, markAsRead } = useNotificationStore();
  const navigate = useNavigate();
  const [timeText, setTimeText] = useState('');

  // Get the first new popup notification
  const popup = notifications.find(n => newNotificationIds.includes(n.id));

  useEffect(() => {
    if (!popup) return;
    
    setTimeText(timeAgo(popup.created_at));
    const timeInterval = setInterval(() => {
      setTimeText(timeAgo(popup.created_at));
    }, 10000);

    // Auto-dismiss after 15 seconds
    const timer = setTimeout(() => {
      markAsRead(popup.id);
    }, 15000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(timeInterval);
    };
  }, [popup?.id, popup?.created_at, markAsRead]);

  if (!popup) return null;

  const handleViewApplication = () => {
    markAsRead(popup.id);
    if (popup.action_url) {
      navigate(popup.action_url);
    }
  };

  const handleDismiss = () => {
    markAsRead(popup.id);
  };

  const config = TYPE_CONFIG[popup.type] || DEFAULT_CONFIG;
  const { colors, icon } = config;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 sm:px-0 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className={`bg-white rounded-xl shadow-2xl border ${colors.borderOuter} overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`${colors.headerBg} border-b ${colors.headerBorder} px-4 py-3 flex items-center justify-between`}>
          <div className={`flex items-center gap-2 ${colors.textPrimary}`}>
            <span className="text-lg">{icon}</span>
            <h3 className="font-bold text-sm tracking-tight">{popup.title || 'Notification'}</h3>
          </div>
          <button 
            onClick={handleDismiss}
            className={`${colors.closeBtn} p-1 rounded-md transition-colors`}
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Body */}
        <div className="px-4 py-3 bg-white">
          <p className="text-sm text-gray-700 leading-relaxed font-medium">
            {popup.message}
          </p>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            {timeText}
          </p>
        </div>
        
        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-end gap-2 bg-gray-50/50">
          <button 
            onClick={handleDismiss}
            className="px-4 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Dismiss
          </button>
          <button 
            onClick={handleViewApplication}
            className={`flex items-center gap-1.5 px-4 py-1.5 ${colors.actionBtn} text-xs font-bold rounded-lg shadow-sm transition-colors`}
          >
            View Details <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPopup;
