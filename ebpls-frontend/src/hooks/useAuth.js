/**
 * useAuth.js
 * Custom hook encapsulating all authentication API interactions.
 *
 * Owns: login, register, forgotPassword, logout.
 * Does NOT own session state — that lives in authStore.js.
 *
 * @policy  All API calls in try/catch. Errors surface as toasts, never throw.
 * @policy  Uses useCallback for all returned functions (memoization policy).
 * @policy  Uses useNavigate() for navigation, never window.location (that
 *          pattern is reserved for apiClient.js which lives outside React).
 * @policy  Mock mode (VITE_MOCK_AUTH=true) returns hardcoded responses so
 *          Phase 2A can be fully tested before Phase 2B backend is live.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS, ROUTES, ROLES } from '../utils/constants';
import useAuthStore from '../store/authStore';
import useUIStore, { TOAST_TYPE } from '../store/UIStore';

// =========================================
// Role → Dashboard Route Map
// Single source of truth for post-login redirects.
// =========================================
const ROLE_DASHBOARDS = Object.freeze({
  [ROLES.APPLICANT]:       ROUTES.APPLICANT_DASHBOARD,
  [ROLES.BPLO_OFFICER]:    ROUTES.BPLO_DASHBOARD,
  [ROLES.TREASURY]:        ROUTES.TREASURY_ASSESSMENT,
  [ROLES.BARANGAY_OFFICER]: ROUTES.BARANGAY_QUEUE,
  [ROLES.ADMIN]:           ROUTES.ADMIN_MASTER_DATA,
});

// =========================================
// Mock Responses (VITE_MOCK_AUTH=true)
// Used when the Phase 2B backend is not yet running.
// =========================================
const MOCK_SESSION = {
  user: {
    userId: 'mock-user-001',
    email: 'dev@liliw-ebpls.gov.ph',
    firstName: 'Dev',
    lastName: 'User',
    roleName: ROLES.APPLICANT,
  },
  accessToken: 'mock-jwt-token-for-development-only',
};

const isMockMode = import.meta.env.VITE_MOCK_AUTH === 'true';

// =========================================
// Hook
// =========================================

/**
 * @returns {{
 *   login: (email: string, password: string) => Promise<void>,
 *   register: ({ firstName: string, lastName: string, email: string, password: string }) => Promise<void>,
 *   forgotPassword: (email: string) => Promise<boolean>,
 *   logout: () => void,
 *   isLoading: boolean,
 * }}
 */
function useAuth() {
  const navigate  = useNavigate();
  const setSession  = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const addToast  = useUIStore((s) => s.addToast);

  const [isLoading, setIsLoading] = useState(false);

  // =========================================
  // login
  // =========================================
  const login = useCallback(
    async (email, password) => {
      setIsLoading(true);
      try {
        const response = isMockMode
          ? { data: MOCK_SESSION }
          : await apiClient.post(API_ENDPOINTS.AUTH_LOGIN, { email, password });

        // The backend returns { success: true, message: '...', data: { accessToken, user: { userId, roleName, ... } } }
        const { user, accessToken } = response.data;

        // Map backend keys to what the store expects if needed,
        // but it's cleaner to just store exactly what the backend sends.
        setSession(
          {
            ...user,
            role: user.roleName, // Map roleName to role for UI consistency
          },
          accessToken,
        );

        addToast({
          message: `Welcome back, ${user.firstName || 'User'}!`,
          type: TOAST_TYPE.SUCCESS,
        });

        // Redirect to the role-appropriate dashboard.
        const destination = ROLE_DASHBOARDS[user.roleName] ?? ROUTES.HOME;
        navigate(destination, { replace: true });
      } catch (err) {
        addToast({
          message: err.message || 'Login failed. Please check your credentials.',
          type: TOAST_TYPE.ERROR,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, setSession, addToast],
  );

  // =========================================
  // register
  // =========================================
  const register = useCallback(
    async ({ firstName, lastName, email, password }) => {
      setIsLoading(true);
      try {
        if (isMockMode) {
          // Mock: simulate a short network delay then succeed.
          await new Promise((r) => setTimeout(r, 600));
        } else {
          await apiClient.post(API_ENDPOINTS.AUTH_REGISTER, {
            firstName, // Corrected to camelCase for backend Zod schema
            lastName,  // Corrected to camelCase for backend Zod schema
            email,
            password,
          });
        }

        addToast({
          message: 'Account created! Please sign in.',
          type: TOAST_TYPE.SUCCESS,
          duration: 5000,
        });

        navigate(ROUTES.LOGIN, { replace: true });
      } catch (err) {
        addToast({
          message: err.message || 'Registration failed. Please try again.',
          type: TOAST_TYPE.ERROR,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, addToast],
  );

  // =========================================
  // forgotPassword
  // Security: ALWAYS show success — never reveal whether email exists.
  // =========================================
  const forgotPassword = useCallback(
    async (email) => {
      setIsLoading(true);
      try {
        if (!isMockMode) {
          await apiClient.post(API_ENDPOINTS.AUTH_FORGOT_PASSWORD, { email });
        } else {
          await new Promise((r) => setTimeout(r, 600));
        }
      } catch {
        // Intentionally swallowed — do not reveal if the email is registered.
      } finally {
        setIsLoading(false);
      }
      // Always return true so the screen can show the confirmation state.
      return true;
    },
    [],
  );

  // =========================================
  // logout
  // =========================================
  const logout = useCallback(() => {
    clearSession();
    addToast({
      message: 'You have been signed out.',
      type: TOAST_TYPE.INFO,
    });
    navigate(ROUTES.LOGIN, { replace: true });
  }, [clearSession, addToast, navigate]);

  return { login, register, forgotPassword, logout, isLoading };
}

export default useAuth;
