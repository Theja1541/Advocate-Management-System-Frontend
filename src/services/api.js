import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const clearAuthStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

const isAuthEndpoint = (url = '') =>
  url.includes('/auth/login') ||
  url.includes('/auth/refresh') ||
  url.includes('/auth/logout');

let activeRequests = 0;
const updateLoader = () => {
  window.dispatchEvent(new CustomEvent('globalLoader', { detail: activeRequests > 0 }));
};

api.interceptors.request.use((config) => {
  activeRequests++;
  updateLoader();
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  activeRequests = Math.max(0, activeRequests - 1);
  updateLoader();
  return Promise.reject(error);
});

let refreshPromise = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then(({ data }) => {
        const token = data?.token;
        if (!token) {
          throw new Error('No access token returned from refresh');
        }
        localStorage.setItem('token', token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => {
    activeRequests = Math.max(0, activeRequests - 1);
    updateLoader();
    return response;
  },
  async (error) => {
    activeRequests = Math.max(0, activeRequests - 1);
    updateLoader();
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || '';

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(requestUrl)
    ) {
      originalRequest._retry = true;
      try {
        const token = await refreshAccessToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch {
        clearAuthStorage();
        if (window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      error.message ||
      'Request failed';

    return Promise.reject(
      Object.assign(new Error(message), {
        status: error.response?.status,
        data: error.response?.data,
        originalError: error,
      })
    );
  }
);

export default api;
