import axios from 'axios';
import { ApiError } from '../api.js';

/**
 * Storefront API client. Customer sessions are separate from the admin session:
 * different storage key, kept in localStorage so customers stay signed in.
 */
export const CUSTOMER_TOKEN_KEY = 'swasti_customer_token';

export const getCustomerToken = () => localStorage.getItem(CUSTOMER_TOKEN_KEY);
export const setCustomerToken = (token) => (token ? localStorage.setItem(CUSTOMER_TOKEN_KEY, token) : localStorage.removeItem(CUSTOMER_TOKEN_KEY));

const http = axios.create({ baseURL: '/api/v1', timeout: 30000 });

http.interceptors.request.use((config) => {
  const token = getCustomerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) return Promise.reject(new ApiError('Can’t reach the server. Please check your connection and try again.', 0));
    const { status, data } = error.response;
    const url = error.config?.url ?? '';
    if (status === 401 && (url.startsWith('/store/account') || url === '/auth/me') && onUnauthorized) onUnauthorized();
    const message = data?.error?.message
      || (status === 429 ? 'Too many requests. Please wait a moment and try again.' : status >= 500 ? 'Something went wrong on our side. Please try again.' : `Request failed (${status}).`);
    return Promise.reject(new ApiError(message, status, data?.error?.details));
  },
);

const unwrap = (promise) => promise.then((response) => response.data?.data);

export const storeApi = {
  get: (url, params) => unwrap(http.get(url, { params })),
  post: (url, body) => unwrap(http.post(url, body)),
  put: (url, body) => unwrap(http.put(url, body)),
  delete: (url) => unwrap(http.delete(url)),
};
