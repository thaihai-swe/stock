import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const googleClientId = process.env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID || '';

  return {
    plugins: [react()],
    define: {
      'import.meta.env.GOOGLE_CLIENT_ID': JSON.stringify(googleClientId),
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(googleClientId),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-dom') || id.includes('react/') || id.includes('react/jsx-runtime')) {
                return 'vendor-react';
              }
              if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
                return 'vendor-charts';
              }
              if (id.includes('@react-oauth/google') || id.includes('google-auth-library')) {
                return 'vendor-auth';
              }
            }
          },
        },
      },
    },
  };
});
