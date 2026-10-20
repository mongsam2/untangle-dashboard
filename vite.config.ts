/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

// 키·토큰은 개발 서버 프록시에서만 붙인다. 브라우저 코드에는 VITE_ 접두사가 붙은 값만 노출된다.
// ADMIN_API_URL이 있으면 백엔드 운영자 API(/api/v1/admin/tangle/dashboard)를 거쳐 배포된 탱글을 읽고,
// 없으면 로컬 탱글 서버에 직접 붙는다.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const adminApi = env.ADMIN_API_URL;
  const proxy: Record<string, ProxyOptions> = adminApi
    ? {
        '/v1/dashboard': {
          target: adminApi,
          changeOrigin: true,
          rewrite: (path: string) =>
            path.replace(/^\/v1\/dashboard/, '/api/v1/admin/tangle/dashboard'),
          headers: env.ADMIN_KEY ? { 'X-Admin-Key': env.ADMIN_KEY } : undefined,
        },
      }
    : {
        '/v1': {
          target: env.TANGLE_SERVER_URL || 'http://127.0.0.1:8010',
          changeOrigin: true,
          headers: env.TANGLE_DASHBOARD_TOKEN
            ? { Authorization: `Bearer ${env.TANGLE_DASHBOARD_TOKEN}` }
            : undefined,
        },
      };
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
