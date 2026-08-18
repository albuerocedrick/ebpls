import { create } from 'zustand';
import apiClient from '../utils/apiClient';
import { API_ENDPOINTS } from '../utils/constants';

// Polling interval ref — stored outside Zustand to avoid serialization issues
let _pollingInterval = null;
const POLL_INTERVAL_MS = 30_000; // 30 seconds

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  // Track which notification IDs are "new" (arrived since last poll) for popup trigger
  newNotificationIds: [],

  fetchUnread: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS_UNREAD);
      const incoming = res?.data ?? [];
      const prev = get().notifications;
      const prevIds = new Set(prev.map(n => n.id));
      const newIds = incoming.filter(n => !prevIds.has(n.id)).map(n => n.id);
      
      set({
        notifications: incoming,
        unreadCount: incoming.length,
        newNotificationIds: newIds,
        isLoading: false,
      });
    } catch (err) {
      console.error('[notificationStore] fetchUnread failed:', err.message);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await apiClient.put(API_ENDPOINTS.NOTIFICATIONS_MARK_READ(id));
      set(state => ({
        notifications: state.notifications.filter(n => n.id !== id),
        unreadCount: Math.max(0, state.unreadCount - 1),
        newNotificationIds: state.newNotificationIds.filter(nid => nid !== id),
      }));
    } catch (err) {
      console.error('[notificationStore] markAsRead failed:', err.message);
    }
  },

  markAllAsRead: async () => {
    try {
      await apiClient.put(API_ENDPOINTS.NOTIFICATIONS_READ_ALL);
      set({ notifications: [], unreadCount: 0, newNotificationIds: [] });
    } catch (err) {
      console.error('[notificationStore] markAllAsRead failed:', err.message);
    }
  },

  clearNewNotificationIds: () => set({ newNotificationIds: [] }),

  startPolling: () => {
    if (_pollingInterval) return; // Already polling
    get().fetchUnread(); // Immediate fetch on start
    _pollingInterval = setInterval(() => {
      get().fetchUnread();
    }, POLL_INTERVAL_MS);
  },

  stopPolling: () => {
    if (_pollingInterval) {
      clearInterval(_pollingInterval);
      _pollingInterval = null;
    }
    set({ notifications: [], unreadCount: 0, newNotificationIds: [] });
  },
}));

export default useNotificationStore;
