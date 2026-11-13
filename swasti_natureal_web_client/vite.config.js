import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:4000',
          changeOrigin: true,
          // The browser sees /api as same-origin (served by Vite), so CORS is not needed.
          // Drop the Origin header so the API never rejects proxied requests,
          // whether the app is opened via localhost, 127.0.0.1 or the LAN IP.
          configure: (proxy) => {
            proxy.on('start', (req) => {
              delete req.headers.origin;
            });
          },
        },
      },
    },
  };
});