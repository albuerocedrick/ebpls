/**
 * UIStore.js
 * Zustand store for global, non-domain UI state.
 * Handles sidebar visibility, active modals, and toast notifications.
 *
 * @policy  This store must NEVER contain business data (applications, users, etc.)
 *          Business data belongs in authStore.js or applicationStore.js.
 * @policy  No side effects (API calls, localStorage writes) inside this store.
 */

import { create } from 'zustand';

// =========================================
// Toast type constants
// =========================================
export const TOAST_TYPE = Object.freeze({
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
});

const useUIStore = create((set, get) => ({
  // =========================================
  // Sidebar State
  //
  // @policy  Starts open on desktop, closed below the lg breakpoint (1024px).
  //          Defaulting to `true` everywhere meant that on a narrow window the
  //          sidebar rendered as an overlay on top of the content while the
  //          layouts simultaneously shifted that content right by
  //          --sidebar-width, so the left edge of every admin/BPLO page was
  //          pushed off-screen and clipped.
  // =========================================
  isSidebarOpen: typeof window === 'undefined' ? true : window.innerWidth >= 1024,

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),

  // =========================================
  // Modal State
  // Supports multiple simultaneous modals via
  // a map of { [modalId]: boolean }
  // =========================================
  modals: {},

  openModal: (modalId) =>
    set((state) => ({
      modals: { ...state.modals, [modalId]: true },
    })),

  closeModal: (modalId) =>
    set((state) => ({
      modals: { ...state.modals, [modalId]: false },
    })),

  isModalOpen: (modalId) => get().modals[modalId] === true,

  closeAllModals: () => set({ modals: {} }),

  // =========================================
  // Toast Notifications
  // Each toast: { id, message, type, duration }
  // =========================================
  toasts: [],

  addToast: ({ message, type = TOAST_TYPE.INFO, duration = 4000 }) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    // Auto-remove after duration
    setTimeout(() => get().removeToast(id), duration);
    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export default useUIStore;
