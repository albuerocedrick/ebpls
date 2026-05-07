/**
 * apiClient.js
 * Base fetch/axios wrapper for all HTTP requests.
 *
 * Phase 2A: JWT injected from authStore on every request.
 *           401 responses trigger automatic session clearance + redirect.
 *
 * @policy  Never import this file with a dynamic require.
 *          Always use named imports.
 * @policy  Uses Zustand's non-hook getState() pattern — this is a plain JS
 *          module, not a React component, so hooks are not available.
 * @policy  On 401, redirect via window.location (not React Router) because
 *          this module lives outside the React tree.
 */

import { API_BASE_URL, ROUTES } from './constants';
import useAuthStore from '../store/authStore';

// =========================================
// Core Request Function
// =========================================

/**
 * Performs an authenticated API request.
 * @param {string} endpoint - API path (e.g. '/api/auth/login')
 * @param {object} options  - Fetch options (method, body, headers, etc.)
 * @returns {Promise<any>}  - Parsed JSON response
 * @throws  Will throw an Error with the server's message on non-2xx responses.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  // Inject JWT from authStore (non-hook access — safe for plain JS modules).
  const token = useAuthStore.getState().token;
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    // 401 Unauthorized — token expired or invalid.
    // Clear the session and hard-redirect to login so the user
    // re-authenticates. window.location is intentional here:
    // React Router's navigate() is not available in this module.
    if (response.status === 401) {
      useAuthStore.getState().clearSession();
      window.location.href = ROUTES.LOGIN;
      // Return a rejected promise so the calling hook still enters catch.
      return Promise.reject(new Error('Session expired. Please sign in again.'));
    }

    const errorData = await response.json().catch(() => ({
      message: `HTTP error ${response.status}`,
    }));
    throw new Error(errorData.message || `HTTP error ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// =========================================
// HTTP Method Helpers
// =========================================

export const apiClient = {
  get: (endpoint, options = {}) =>
    request(endpoint, { ...options, method: 'GET' }),

  post: (endpoint, body, options = {}) =>
    request(endpoint, { ...options, method: 'POST', body }),

  put: (endpoint, body, options = {}) =>
    request(endpoint, { ...options, method: 'PUT', body }),

  patch: (endpoint, body, options = {}) =>
    request(endpoint, { ...options, method: 'PATCH', body }),

  delete: (endpoint, options = {}) =>
    request(endpoint, { ...options, method: 'DELETE' }),
};

export default apiClient;
