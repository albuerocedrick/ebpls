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

  if (options.body instanceof FormData) {
    config.body = options.body;
    // When using FormData, fetch automatically sets the correct Content-Type with boundary
    delete config.headers['Content-Type'];
  } else if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    // Attempt to parse error details from the JSON body
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `Request failed with status ${response.status}`;

    // 401 Unauthorized Handling
    // Triggers auto-logout and redirect.
    if (response.status === 401) {
      useAuthStore.getState().clearSession();

      // Only hard-redirect if we are NOT already on the login page.
      if (!window.location.pathname.includes(ROUTES.LOGIN)) {
        window.location.href = ROUTES.LOGIN;
      }

      return Promise.reject(new Error(errorMessage));
    }

    throw new Error(errorMessage);
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
