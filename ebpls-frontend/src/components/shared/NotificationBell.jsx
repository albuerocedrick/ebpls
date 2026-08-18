import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useNotificationStore from '../../store/notificationStore';

const NotificationBell = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    setIsOpen(false);
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    setIsOpen(false);
  };

  const formatRelativeTime = (timestamp) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diffDays = Math.round((new Date(timestamp).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const diffHours = Math.round((new Date(timestamp).getTime() - Date.now()) / (1000 * 60 * 60));
    const diffMins = Math.round((new Date(timestamp).getTime() - Date.now()) / (1000 * 60));
    
    if (Math.abs(diffDays) > 0) return rtf.format(diffDays, 'day');
    if (Math.abs(diffHours) > 0) return rtf.format(diffHours, 'hour');
    if (Math.abs(diffMins) > 0) return rtf.format(diffMins, 'minute');
    return 'Just now';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full transition-colors ml-1"
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-sm text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 flex flex-col items-center">
                <Bell size={24} className="text-gray-300 mb-2" />
                <p>No unread notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap ml-2">
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-gray-100 p-2 bg-gray-50/50">
              <button 
                onClick={handleMarkAllAsRead}
                className="w-full py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/50 rounded-lg transition-colors"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
