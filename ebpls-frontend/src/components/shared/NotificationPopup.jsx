import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, X, ArrowRight } from 'lucide-react';
import useNotificationStore from '../../store/notificationStore';

const NotificationPopup = () => {
  const { notifications, newNotificationIds, markAsRead, clearNewNotificationIds } = useNotificationStore();
  const navigate = useNavigate();

  // Get the first new APPLICATION_RETURNED notification
  const popup = notifications.find(
    n => newNotificationIds.includes(n.id) && n.type === 'APPLICATION_RETURNED'
  );

  useEffect(() => {
    if (!popup) return;
    
    // Auto-dismiss after 15 seconds
    const timer = setTimeout(() => {
      markAsRead(popup.id);
    }, 15000);
    
    return () => clearTimeout(timer);
  }, [popup?.id, markAsRead]);

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

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 sm:px-0 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-white rounded-xl shadow-2xl border border-red-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle size={18} strokeWidth={2.5} />
            <h3 className="font-bold text-sm tracking-tight">{popup.title || 'Application Returned'}</h3>
          </div>
          <button 
            onClick={handleDismiss}
            className="text-red-400 hover:text-red-700 hover:bg-red-100 p-1 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Body */}
        <div className="px-4 py-3 bg-white">
          <p className="text-sm text-gray-700 leading-relaxed font-medium">
            {popup.message}
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
            className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
          >
            View Application <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPopup;
