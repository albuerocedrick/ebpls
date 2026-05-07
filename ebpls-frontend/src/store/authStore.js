/**
 * authStore.js
 * Zustand store for user session and authentication state.
 * Persisted to localStorage so the session survives page refreshes.
 *
 * @policy  This store is PURE — no API calls, no side effects.
 *          All API interactions belong in hooks/useAuth.js.
 * @policy  Never store the raw password. Only the JWT token is persisted.
 * @policy  `role` is a computed getter derived from `user?.role`.
 *          Never store it as a separate field to prevent state drift.
 *
 * Shape:
 *   user            — { userId, email, firstName, lastName, roleName }
 *   token           — accessToken (JWT) returned by POST /api/auth/login
 *   isAuthenticated — boolean, true when token + user are both set
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =========================================
// Initial State
// Extracted so clearSession() can reset
// the store to exactly this shape.
// =========================================
const INITIAL_STATE = {
  user: null,   // { userId, email, firstName, lastName, roleName }
  token: null,  // accessToken (JWT)
  isAuthenticated: false,
};

const useAuthStore = create(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      // =========================================
      // Computed Getter
      // Read role via useAuthStore.getState().role
      // or useAuthStore((s) => s.user?.roleName)
      // =========================================
      get role() {
        return this.user?.roleName ?? null;
      },

      // =========================================
      // Actions
      // =========================================

      /**
       * setSession — called after a successful login.
       * @param {object} user — { userId, email, firstName, lastName, roleName }
       * @param {string} token — accessToken (JWT)
       */
      setSession: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),

      /**
       * clearSession — called on logout or 401 response.
       * Resets all fields to their initial values.
       */
      clearSession: () => set({ ...INITIAL_STATE }),
    }),
    {
      name: 'ebpls-auth', // localStorage key
      // Only persist the fields needed to restore session.
      // Functions and getters are NOT serialisable — exclude them.
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export default useAuthStore;
