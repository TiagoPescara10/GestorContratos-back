const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// Token refresh flag to prevent multiple refresh attempts
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(token) {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

async function getAuthToken() {
  return localStorage.getItem('access_token');
}

async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}/${path}`.replace(/\/\/+/, '/').replace('http:/', 'http://').replace('https:/', 'https://');

  const headers = {
    'Accept': 'application/json',
    ...options.headers,
  };

  // Add auth token if available (except for login/refresh endpoints)
  const isAuthEndpoint = path.includes('auth/login') || path.includes('auth/refresh');
  if (!isAuthEndpoint) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let body = options.body;

  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      ...options,
      headers,
      body,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && !isAuthEndpoint) {
        const originalRequest = options;
        
        if (!isRefreshing) {
          isRefreshing = true;
          
          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({ refresh: refreshToken }),
            });

            const refreshData = await refreshResponse.json();

            if (!refreshResponse.ok) {
              throw new Error('Token refresh failed');
            }

            const { access } = refreshData;
            localStorage.setItem('access_token', access);
            
            isRefreshing = false;
            onTokenRefreshed(access);

            // Retry original request with new token
            return apiFetch(path, originalRequest);
          } catch (refreshError) {
            isRefreshing = false;
            // Refresh failed, clear tokens and redirect to login
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            
            // Only redirect if we're in a browser environment
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            
            throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
          }
        } else {
          // Wait for token refresh to complete
          return new Promise((resolve, reject) => {
            subscribeTokenRefresh((token) => {
              // Retry original request with new token
              apiFetch(path, originalRequest)
                .then(resolve)
                .catch(reject);
            });
          });
        }
      }

      // Create enhanced error object
      const error = new Error(data?.message || data?.detail || `API request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      error.path = path;
      
      // Add specific error types for common HTTP errors
      if (response.status === 400) {
        error.type = 'VALIDATION_ERROR';
      } else if (response.status === 403) {
        error.type = 'PERMISSION_ERROR';
      } else if (response.status === 404) {
        error.type = 'NOT_FOUND_ERROR';
      } else if (response.status >= 500) {
        error.type = 'SERVER_ERROR';
      }
      
      throw error;
    }

    return data;
  } catch (error) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error('Error de conexión. Verifica tu conexión a internet.');
      networkError.type = 'NETWORK_ERROR';
      networkError.originalError = error;
      throw networkError;
    }
    
    // Re-throw API errors
    throw error;
  }
}

// Utility functions for common HTTP methods
export const api = {
  get: (path, options = {}) => apiFetch(path, { ...options, method: 'GET' }),
  post: (path, data, options = {}) => apiFetch(path, { ...options, method: 'POST', body: data }),
  put: (path, data, options = {}) => apiFetch(path, { ...options, method: 'PUT', body: data }),
  patch: (path, data, options = {}) => apiFetch(path, { ...options, method: 'PATCH', body: data }),
  delete: (path, options = {}) => apiFetch(path, { ...options, method: 'DELETE' }),
};

export default apiFetch;
