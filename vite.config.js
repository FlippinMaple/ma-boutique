import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';
import history from 'connect-history-api-fallback';

export default defineConfig({
  plugins: [react(), mkcert()],
  server: {
    https: false, // ou true si tu veux tester en SSL
    port: 3000,
    open: true,
    fs: {
      strict: false
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4242', // 👈 adapte ce port si besoin
        changeOrigin: true,
        secure: false
      }
    },
    setupMiddlewares(middlewares) {
      middlewares.use(history());
      return middlewares;
    }
  }
});
