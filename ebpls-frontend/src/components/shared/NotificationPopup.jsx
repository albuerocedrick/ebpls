import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ArrowRight,
  Search,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  AlertTriangle,
  FileText,
  Megaphone,
} from 'lucide-react';
import useNotificationStore from '../../store/notificationStore';

/**
 * Per-type presentation.
 *
 * @policy  Neutral zinc only — the type is conveyed by a Lucide glyph and an
 *          eyebrow label, never by hue. `emphasis: true` marks notifications
 *          that need the applicant to act, and renders a solid zinc-900 header
 *          instead of a hairline one.
 */
const TYPE_CONFIG = {
  APPLICATION_UNDER_REVIEW: { Icon: Search, label: 'Under review' },
  APPLICATION_VERIFIED: { Icon: CheckCircle2, label: 'Verified' },
  APPLICATION_ASSESSED: { Icon: ClipboardList, label: 'Assessed', emphasis: true },
  PAYMENT_CONFIRMED: { Icon: CreditCard, label: 'Payment confirmed' },
  APPLICATION_RETURNED: { Icon: AlertTriangle, label: 'Action required', emphasis: true },
  CERT_READY: { Icon: FileText, label: 'Certificate ready', emphasis: true },
};

const DEFAULT_CONFIG = { Icon: Megaphone, label: 'Notification' };

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
  const { notifications, newNotificationIds, markAsRead, removeNewNotificationId } = useNotificationStore();
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
      removeNewNotificationId(popup.id);
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
    removeNewNotificationId(popup.id);
  };

  const config = TYPE_CONFIG[popup.type] || DEFAULT_CONFIG;
  const { Icon, label, emphasis } = config;

  return (
    <div className="fixed top-4 left-1/2 z-[100] w-full max-w-md -translate-x-1/2 px-4 duration-300 animate-in fade-in slide-in-from-top-4 sm:px-0">
      <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl">
        {/* Header */}
        <div
          className={[
            'flex items-center justify-between px-4 py-3',
            emphasis ? 'bg-zinc-900' : 'border-b border-zinc-200 bg-zinc-50',
          ].join(' ')}
        >
          <div className={`flex items-center gap-2.5 ${emphasis ? 'text-white' : 'text-zinc-900'}`}>
            <Icon size={15} className={emphasis ? 'text-zinc-400' : 'text-zinc-500'} />
            <div className="flex flex-col">
              <span
                className={[
                  'font-mono text-[9px] tracking-[0.16em] uppercase',
                  emphasis ? 'text-zinc-400' : 'text-zinc-500',
                ].join(' ')}
              >
                {label}
              </span>
              <h3 className="text-sm font-medium tracking-tight">{popup.title || 'Notification'}</h3>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss notification"
            className={[
              'rounded-md p-1 transition-colors duration-200 focus-visible:outline-none motion-reduce:transition-none',
              emphasis
                ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white focus-visible:ring-2 focus-visible:ring-white'
                : 'text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900',
            ].join(' ')}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="bg-white px-4 py-3">
          <p className="text-sm leading-relaxed text-zinc-700">
            {popup.message}
          </p>
          <p className="mt-2 font-mono text-[10px] tracking-[0.08em] text-zinc-500 uppercase">
            {timeText}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-3">
          <button
            onClick={handleDismiss}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors duration-200 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none motion-reduce:transition-none"
          >
            Dismiss
          </button>
          <button
            onClick={handleViewApplication}
            className="group flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
          >
            View details
            <ArrowRight
              size={13}
              className="transition-transform duration-300 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPopup;
