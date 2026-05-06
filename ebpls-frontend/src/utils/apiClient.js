/**
 * apiClient.js
 * Base fetch/axios wrapper for all HTTP requests.
 *
 * Phase 0 scope: Sets up base URL configuration only.
 * JWT interceptors will be added in Phase 2B.
 *
 * @policy Never import this file with a dynamic require.
 *         Always use named imports.
 */

import { API_BASE_URL } from './constants';

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

  // Phase 2B: JWT will be injected here via authStore token
  // const token = useAuthStore.getState().token;
  // if (token) defaultHeaders['Authorization'] = `Bearer ${token}`;

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
