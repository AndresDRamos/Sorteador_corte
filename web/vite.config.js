// Configuracion Vite con proxy a Express para evitar CORS en desarrollo.
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      // Toda llamada que empiece por /api se redirige al backend Express.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
