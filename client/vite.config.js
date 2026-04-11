import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_DEV_API || 'http://127.0.0.1:3001';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/report': {
          target,
          changeOrigin: true,
        },
        '/api': {
          target,
          changeOrigin: true,
        },
        '/proportionality': {
          target,
          changeOrigin: true,
        },
      },
    },
  };
});
