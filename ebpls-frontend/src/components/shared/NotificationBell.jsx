import { useState, useEffect, useRef } from 'react';
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
        className="relative ml-1 flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors duration-200 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
        aria-label="Notifications"
      >
        <Bell size={17} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-900 px-1 font-mono text-[9px] text-white ring-2 ring-white tabular-nums">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
            <h3 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-white tabular-nums">
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-8 text-center text-sm text-zinc-500">
                <Bell size={20} className="mb-2 text-zinc-300" />
                <p>No unread notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className="group cursor-pointer p-4 transition-colors duration-200 hover:bg-zinc-50 motion-reduce:transition-none"
                  >
                    <div className="mb-1 flex items-start justify-between">
                      <h4 className="text-sm font-medium text-zinc-900">
                        {notif.title}
                      </h4>
                      <span className="ml-2 font-mono text-[10px] whitespace-nowrap text-zinc-500">
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs leading-relaxed text-zinc-600">
                      {notif.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-zinc-200 bg-zinc-50 p-2">
              <button 
                onClick={handleMarkAllAsRead}
                className="w-full rounded-md py-2 font-mono text-[10px] tracking-[0.12em] text-zinc-600 uppercase transition-colors duration-200 hover:bg-zinc-200 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none motion-reduce:transition-none"
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
