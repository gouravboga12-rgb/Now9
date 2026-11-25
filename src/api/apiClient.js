// Centralized API Client for Now 9 Backend (EC2 + PostgreSQL)

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // When running directly on EC2 IP/domain, use relative /api (Nginx reverse proxy)
    if (host === '16.113.15.80' || host.includes('now9')) {
      return '/api';
    }
  }
  // Local dev or external preview points to EC2 backend
  return 'http://16.113.15.80/api';
};

export const API_BASE_URL = getBaseUrl();

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  };

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `API Error: ${response.status}`);
  }
  return data;
}

export const apiClient = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
};
