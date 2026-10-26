/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

// 키·토큰은 개발 서버·미리보기 서버의 프록시에서만 붙인다. 브라우저 코드에는 VITE_ 접두사가 붙은 값만 노출된다.
// ADMIN_API_URL이 있으면 백엔드 운영자 API(/api/v1/admin/tangle/dashboard/*)를 거쳐 배포된 탱글을 읽고,
// 없으면 로컬 탱글 서버의 /v2/dashboard/*에 직접 붙는다. 앱과 마찬가지로 대시보드도 운영 환경에서는 백엔드를 거친다.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const adminApi = env.ADMIN_API_URL;
  const proxy: Record<string, ProxyOptions> = adminApi
    ? {
        '/v2/dashboard': {
          target: adminApi,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/v2\/dashboard/, '/api/v1/admin/tangle/dashboard'),
          headers: env.ADMIN_KEY ? { 'X-Admin-Key': env.ADMIN_KEY } : undefined,
        },
      }
    : {
        '/v2': {
          target: env.TANGLE_SERVER_URL || 'http://127.0.0.1:8010',
          changeOrigin: true,
          headers: env.TANGLE_DASHBOARD_TOKEN ? { Authorization: `Bearer ${env.TANGLE_DASHBOARD_TOKEN}` } : undefined,
        },
      };
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy,
    },
    // 빌드 결과를 띄우는 `bun run preview`도 같은 프록시를 써서, 정적 호스팅 없이 한 프로세스로 배포할 수 있다.
    preview: {
      port: 4173,
      host: true,
      proxy,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
