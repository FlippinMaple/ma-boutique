// src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4242',
  withCredentials: true
});

/* ------- Request: ajoute le Bearer si présent ------- */
api.interceptors.request.use((config) => {
  const access = localStorage.getItem('authToken');
  if (access) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

/* ------- Response: refresh unique + file d'attente ------- */
let isRefreshing = false;
let queue = [];

function drainQueue(error, token = null) {
  queue.forEach(({ resolve, reject, config }) => {
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      resolve(api({ ...config, __retry: true }));
    } else {
      reject(error);
    }
  });
  queue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const resp = error?.response;
    const originalRequest = error?.config || {};

    // Si pas de réponse (réseau / CORS), ne tente rien ici
    if (!resp) return Promise.reject(error);

    // Évite de rafraîchir sur le endpoint de refresh lui-même
    const isRefreshCall = originalRequest?.url?.includes(
      '/api/auth/refresh-token'
    );

    // 401: tente un refresh (une seule fois par rafale)
    if (resp.status === 401 && !originalRequest.__retry && !isRefreshCall) {
      // Si un refresh est déjà en cours, mets la requête en attente
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject, config: originalRequest });
        });
      }

      isRefreshing = true;
      originalRequest.__retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('NO_REFRESH_TOKEN');
        }

        // ✅ Chemin corrigé
        const { data } = await api.post('/api/auth/refresh-token', {
          refreshToken
        });

        const newAccess = data?.accessToken;
        if (!newAccess) throw new Error('NO_ACCESS_IN_REFRESH');

        // Stocke et rejoue
        localStorage.setItem('authToken', newAccess);

        // Rejoue la requête initiale
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        const retried = await api(originalRequest);

        // Réveille la file
        drainQueue(null, newAccess);
        return retried;
      } catch (e) {
        // Échec du refresh: purge et réveille la file en erreur
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        drainQueue(e, null);
        // Optionnel: rediriger
        // window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    // Autres erreurs ou 401 déjà retenté
    return Promise.reject(error);
  }
);

export default api;
