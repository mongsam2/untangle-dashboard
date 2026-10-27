// Vercel 함수. 실제 처리는 로컬 개발 서버와 같은 server/dashboardApi.ts가 한다. 환경 변수는 Vercel 프로젝트 설정에 둔다.
// 확장자 .js는 Vercel이 ESM으로 실행할 때 필요하다(TypeScript는 .ts 파일로 찾는다).
import { apiConfig, handleApi } from '../server/dashboardApi.js';

const config = apiConfig(process.env);

export default {
  fetch(request: Request): Promise<Response> {
    return handleApi(request, config);
  },
};
