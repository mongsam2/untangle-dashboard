/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// 토큰은 개발 서버 프록시에서만 붙인다. 브라우저 코드에는 VITE_ 접두사가 붙은 값만 노출된다.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.TANGLE_SERVER_URL || 'http://127.0.0.1:8010';
  const token = env.TANGLE_DASHBOARD_TOKEN;
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/v1': {
          target,
          changeOrigin: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
