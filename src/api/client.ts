// 조회 API 클라이언트. VITE_API_MODE=mock(기본)이면 내장 예시 데이터, live면 /v1/dashboard를 부른다.
import { ApiError } from './errors';
import { createMockHandlers } from './mock/handlers';
import type {
  CaseDetailResponse,
  RunDetailResponse,
  RunFilters,
  RunListResponse,
  RunPage,
  StatsResponse,
} from './types';

export interface DashboardApi {
  listRuns(page: RunPage): Promise<RunListResponse>;
  getRun(requestId: string): Promise<RunDetailResponse>;
  getCase(testCaseId: string): Promise<CaseDetailResponse>;
  getStats(filters: RunFilters): Promise<StatsResponse>;
}

export type ApiMode = 'mock' | 'live';

export const apiMode: ApiMode = import.meta.env.VITE_API_MODE === 'live' ? 'live' : 'mock';

const BASE = '/v1/dashboard';

export function toQuery(params: RunPage): string {
  const q = new URLSearchParams();
  if (params.source && params.source !== 'all') q.set('source', params.source);
  if (params.path) q.set('path', params.path);
  if (params.status) q.set('status', params.status);
  if (params.limit) q.set('limit', String(params.limit));
  if (params.cursor) q.set('cursor', params.cursor);
  const s = q.toString();
  return s ? '?' + s : '';
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    let code = 'http_error';
    let message = res.statusText || '요청에 실패했어요.';
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // 본문이 JSON이 아니면 상태 코드만 쓴다.
    }
    throw new ApiError(res.status, code, message);
  }
  return (await res.json()) as T;
}

const liveApi: DashboardApi = {
  listRuns: (page) => getJson(`/runs${toQuery(page)}`),
  getRun: (id) => getJson(`/runs/${encodeURIComponent(id)}`),
  getCase: (id) => getJson(`/cases/${encodeURIComponent(id)}`),
  getStats: (f) => getJson(`/stats${toQuery(f)}`),
};

// 실제 네트워크처럼 다음 틱 이후에 응답한다.
const MOCK_LATENCY_MS = 60;

function mockApi(): DashboardApi {
  const h = createMockHandlers();
  const later = <T>(fn: () => T) =>
    new Promise<T>((resolve, reject) =>
      setTimeout(() => {
        try {
          resolve(structuredClone(fn()));
        } catch (e) {
          reject(e);
        }
      }, MOCK_LATENCY_MS),
    );
  return {
    listRuns: (page) => later(() => h.listRuns(page)),
    getRun: (id) => later(() => h.getRun(id)),
    getCase: (id) => later(() => h.getCase(id)),
    getStats: (f) => later(() => h.getStats(f)),
  };
}

export const api: DashboardApi = apiMode === 'live' ? liveApi : mockApi();
