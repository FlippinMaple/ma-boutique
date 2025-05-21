import axios from 'axios';

// Créer une instance d'axios pour ajouter un token d'authentification
const api = axios.create({
  baseURL: 'http://localhost:4242' // L'URL de ton serveur
});

// Intercepteur pour vérifier les erreurs 401 (token expiré)
api.interceptors.response.use(
  (response) => response, // Si la requête réussie, la réponse est renvoyée
  async (error) => {
    const originalRequest = error.config;

    // Si le token est expiré (erreur 401)
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Essayer de renouveler le token avec le refresh token
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await api.post('/api/refresh-token', {
            refreshToken
          });
          const newAccessToken = response.data.accessToken;

          // Stocker le nouveau access token dans le localStorage
          localStorage.setItem('authToken', newAccessToken);

          // Refaire la requête initiale avec le nouveau token
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return api(originalRequest); // Refaire la requête avec le nouveau token
        } catch (err) {
          console.error('Erreur de renouvellement du token', err);
          window.location.href = '/login'; // Si le refresh token est expiré ou invalide
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
