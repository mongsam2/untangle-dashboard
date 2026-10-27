/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { apiConfig, assertNoLegacyEnv, nodeMiddleware } from './server/dashboardApi';

// 접근 키 확인과 조회 중계(/api/*)를 개발 서버·미리보기 서버에 붙인다. Vercel에서는 api/*.ts 함수가 같은 일을 한다.
// 운영자 키·탱글 토큰·접근 키는 서버 쪽에서만 쓴다. 브라우저 코드에는 VITE_ 접두사가 붙은 값만 노출된다.
function dashboardApi(env: Record<string, string>): Plugin {
  assertNoLegacyEnv(env);
  const config = apiConfig(env);
  const middleware = nodeMiddleware(config);
  return {
    name: 'dashboard-api',
    configureServer(server) {
      if (env.VITE_API_MODE === 'live') for (const w of config.warnings) server.config.logger.warn(`[dashboard] ${w}`);
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), dashboardApi(env)],
    server: {
      port: 5173,
    },
    // 빌드 결과를 띄우는 `bun run preview`도 같은 /api/*를 붙여, 한 프로세스로 배포할 수 있다.
    preview: {
      port: 4173,
      host: true,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
    },
  };
});
