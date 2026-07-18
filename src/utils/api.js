// src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

const NO_REFRESH_PATHS = [
  '/auth/refresh-token',
  '/auth/login',
  '/auth/logout'
];

function isNoRefreshAuthRequest(config) {
  const url = String(config?.url || '');
  return NO_REFRESH_PATHS.some(
    (path) => url === path || url.startsWith(`${path}?`) || url.endsWith(path)
  );
}

let isRefreshing = false;
let queue = [];

function resolveQueue(error = null) {
  const pending = [...queue];
  queue = [];
  for (const { resolve, reject } of pending) {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config || {};
    const status = error?.response?.status;

    if (!status) {
      return Promise.reject(error);
    }

    if (status === 401 && isNoRefreshAuthRequest(original)) {
      return Promise.reject(error);
    }

    if (status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({
            resolve: async () => {
              try {
                const resp = await api.request(original);
                resolve(resp);
              } catch (e) {
                reject(e);
              }
            },
            reject
          });
        });
      }

      isRefreshing = true;
      try {
        await api.post('/auth/refresh-token');
        resolveQueue(null);
        return api.request(original);
      } catch (refreshErr) {
        resolveQueue(refreshErr);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
