// src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

/**
 * Gestion centralisée du refresh:
 * - Quand une réponse 401 arrive, on tente 1 refresh (cookie httpOnly "refresh")
 * - On file d’attente les requêtes le temps que le refresh se termine
 * - Un seul retry par requête (flag _retry)
 */

let isRefreshing = false;
let queue = [];

function resolveQueue(error = null) {
  const pending = [...queue];
  queue = [];
  for (const { resolve, reject } of pending) {
    error ? reject(error) : resolve();
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config || {};
    const status = error?.response?.status;

    // Pas d’accès au réseau ou autre
    if (!status) return Promise.reject(error);

    // Si 401 et pas encore retenté
    if (status === 401 && !original._retry) {
      original._retry = true;

      // Mécanisme "file d'attente" pendant le refresh
      if (isRefreshing) {
        // retourne une promesse qui s’exécute après le refresh en cours
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
        // Endpoint côté serveur: /auth/refresh-token
        await api.post('/auth/refresh-token');
        resolveQueue(null);
        // Rejoue la requête initiale
        return api.request(original);
      } catch (refreshErr) {
        resolveQueue(refreshErr);
        // Ici on peut, si désiré, rediriger vers /login
        // window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Sinon: pas d’auto-gestion → laisse remonter l’erreur
    return Promise.reject(error);
  }
);

export default api;
