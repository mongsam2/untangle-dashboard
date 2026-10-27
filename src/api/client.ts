// 조회 API 클라이언트. VITE_API_MODE=mock(기본)이면 내장 예시 데이터, live면 고른 서버의 조회를 /api/dashboard로 부른다.
// /api/*는 로컬에서는 개발 서버 미들웨어, 배포에서는 Vercel 함수가 받는다(server/dashboardApi.ts).
import { ApiError } from './errors';
import { createMockHandlers } from './mock/handlers';
import { isServerId, type ServerId } from './servers';
import type {
  CaseDetailResponse,
  RunDetailResponse,
  RunFilters,
  RunListResponse,
  RunPage,
  SessionDetailResponse,
  SessionListResponse,
  SessionPage,
  StatsResponse,
} from './types';

export interface DashboardApi {
  listRuns(page: RunPage): Promise<RunListResponse>;
  getRun(turnId: string): Promise<RunDetailResponse>;
  listSessions(page: SessionPage): Promise<SessionListResponse>;
  getSession(sessionId: string): Promise<SessionDetailResponse>;
  getCase(testCaseId: string): Promise<CaseDetailResponse>;
  getStats(filters: RunFilters): Promise<StatsResponse>;
}

export type ApiMode = 'mock' | 'live';

export const apiMode: ApiMode = import.meta.env.VITE_API_MODE === 'live' ? 'live' : 'mock';

/** 서버 함수가 접근 키를 받는 헤더. server/dashboardApi.ts의 ACCESS_HEADER와 같다. */
export const ACCESS_HEADER = 'X-Dashboard-Key';

let accessKey: string | null = null;
let accessDenied: (() => void) | null = null;

/** 접근 키 확인을 통과한 키. 이후 모든 조회 요청에 붙는다. */
export function setAccessKey(key: string | null): void {
  accessKey = key;
}

/** 조회 중에 접근 키가 거절되면(키가 바뀐 경우) 부를 함수. */
export function onAccessDenied(handler: (() => void) | null): void {
  accessDenied = handler;
}

export function toQuery(params: RunPage & SessionPage): string {
  const q = new URLSearchParams();
  if (params.source && params.source !== 'all') q.set('source', params.source);
  if (params.status) q.set('status', params.status);
  if (params.limit) q.set('limit', String(params.limit));
  if (params.cursor) q.set('cursor', params.cursor);
  const s = q.toString();
  return s ? '?' + s : '';
}

/** 브라우저가 부르는 주소. 서버와 조회 경로를 조회 조건과 함께 검색어로 넘긴다. */
export function dashboardUrl(server: ServerId, route: string, query = ''): string {
  const q = new URLSearchParams(query);
  q.set('server', server);
  q.set('route', route);
  return '/api/dashboard?' + q.toString();
}

/** 본문에 오류 설명이 없을 때 상태 코드로 원인을 짐작해 알려 준다. */
export function fallbackMessage(status: number, statusText: string): string {
  if (status === 404) return '이 서버에서 대시보드 데이터를 찾지 못했어요. 백엔드·탱글에 대시보드가 배포됐는지, 운영자 키가 맞는지 확인해 주세요. (404)';
  if (status >= 500) return `서버에 연결하지 못했어요. 서버가 떠 있는지 확인해 주세요. (${status})`;
  return statusText || `요청에 실패했어요. (${status})`;
}

async function errorOf(res: Response): Promise<ApiError> {
  let code = 'http_error';
  let message = fallbackMessage(res.status, res.statusText);
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    code = body.error?.code ?? code;
    message = body.error?.message ?? message;
  } catch {
    // 본문이 JSON이 아니면 상태 코드로 만든 설명을 쓴다.
  }
  return new ApiError(res.status, code, message);
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json', [ACCESS_HEADER]: accessKey ?? '' } });
  if (!res.ok) {
    const error = await errorOf(res);
    if (error.code === 'access_denied') accessDenied?.();
    throw error;
  }
  return (await res.json()) as T;
}

export type AccessResult = { ok: true; servers: ServerId[] } | { ok: false; message: string };

/** 접근 키를 확인하고 연결된 서버 목록을 받는다. 화면 진입 때 한 번만 부른다. */
export async function checkAccess(key: string): Promise<AccessResult> {
  try {
    const res = await fetch('/api/access', { headers: { Accept: 'application/json', [ACCESS_HEADER]: key } });
    if (!res.ok) return { ok: false, message: (await errorOf(res)).message };
    const body = (await res.json()) as { servers?: unknown[] };
    const servers = (body.servers ?? []).filter(isServerId);
    if (servers.length === 0) return { ok: false, message: '연결된 서버가 없어요. 서버 주소와 운영자 키 설정을 확인해 주세요.' };
    return { ok: true, servers };
  } catch {
    return { ok: false, message: '대시보드 서버에 연결하지 못했어요.' };
  }
}

function liveApi(server: ServerId): DashboardApi {
  return {
    listRuns: (page) => getJson(dashboardUrl(server, 'runs', toQuery(page))),
    getRun: (id) => getJson(dashboardUrl(server, `runs/${id}`)),
    listSessions: (page) => getJson(dashboardUrl(server, 'sessions', toQuery(page))),
    getSession: (id) => getJson(dashboardUrl(server, `sessions/${id}`)),
    getCase: (id) => getJson(dashboardUrl(server, `cases/${id}`)),
    getStats: (f) => getJson(dashboardUrl(server, 'stats', toQuery(f))),
  };
}

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
    listSessions: (page) => later(() => h.listSessions(page)),
    getSession: (id) => later(() => h.getSession(id)),
    getCase: (id) => later(() => h.getCase(id)),
    getStats: (f) => later(() => h.getStats(f)),
  };
}

const live = new Map<ServerId, DashboardApi>();
let mock: DashboardApi | null = null;

/** 고른 서버의 API. mock 모드이거나 서버가 없으면 예시 데이터를 쓴다. */
export function apiFor(server: ServerId | null): DashboardApi {
  if (apiMode === 'live' && server) {
    let api = live.get(server);
    if (!api) {
      api = liveApi(server);
      live.set(server, api);
    }
    return api;
  }
  mock ??= mockApi();
  return mock;
}
