import axios from 'axios';

export const SESSION_KEY = 'swasti_access_token';
/** Role a super admin is currently "viewing as" (per tab). Sent as `X-View-As` on every request. */
export const VIEW_AS_KEY = 'swasti_view_as';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function defaultMessage(status) {
  if (status === 429) return 'Too many requests. Please wait a few minutes and try again.';
  if (status >= 500) return 'The server had a problem. Please try again shortly.';
  return `Request failed (${status}).`;
}

/** Shared axios instance. Requests go through the Vite `/api` proxy. */
export const http = axios.create({ baseURL: '/api/v1', timeout: 30000 });

http.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(SESSION_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const viewAs = sessionStorage.getItem(VIEW_AS_KEY);
  if (token && viewAs) config.headers['X-View-As'] = viewAs;
  return config;
});

let unauthorizedHandler = null;
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    if (!error.response) {
      return Promise.reject(new ApiError('Can’t reach the API. Check that the server is running and try again.', 0));
    }
    const { status, data } = error.response;
    const isLogin = error.config?.url?.includes('/auth/login');
    if (status === 401 && !isLogin && unauthorizedHandler) unauthorizedHandler();
    return Promise.reject(new ApiError(data?.error?.message || defaultMessage(status), status, data?.error?.details));
  },
);

const unwrap = (promise) => promise.then((response) => response.data?.data);

export const api = {
  get: (url, params, config) => unwrap(http.get(url, { params, ...config })),
  post: (url, body, config) => unwrap(http.post(url, body, config)),
  put: (url, body, config) => unwrap(http.put(url, body, config)),
  patch: (url, body, config) => unwrap(http.patch(url, body, config)),
  delete: (url, config) => unwrap(http.delete(url, config)),
};

/** Builds multipart form data: JSON fields in `data`, plus files. */
export function toFormData(data, files = {}) {
  const form = new FormData();
  form.append('data', JSON.stringify(data));
  for (const [field, value] of Object.entries(files)) {
    for (const file of [].concat(value ?? [])) if (file instanceof File) form.append(field, file);
  }
  return form;
}

export function login(credentials) {
  return api.post('/auth/login', credentials);
}

export function getCurrentUser() {
  return api.get('/auth/me');
}
