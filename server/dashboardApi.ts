// 대시보드의 서버 쪽 API. 로컬 개발 서버(vite.config.ts)와 Vercel 함수(api/*.ts)가 같은 코드를 쓴다.
//
//   GET  /api/access                               접근 키를 확인하고 연결된 서버 목록을 준다
//   GET  /api/dashboard?server=<id>&route=<경로>&…  고른 서버의 탱글 대시보드 조회를 중계한다
//   POST /api/dashboard?server=<id>&route=<경로>    테스트 실행 시작·중단을 본문 그대로 중계한다. 운영 서버로는 보내지 않는다
//
// 모든 경로는 요청 헤더 X-Dashboard-Key가 DASHBOARD_ACCESS_KEY와 같아야 한다. 운영자 키·탱글 토큰은
// 이 파일이 서버 쪽에서만 붙이고 브라우저로는 보내지 않는다.
import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** src/api/servers.ts의 SERVER_IDS와 같은 목록이다. */
export const SERVER_IDS = ['dev', 'prod', 'local'] as const;
export type ServerId = (typeof SERVER_IDS)[number];

export const ACCESS_HEADER = 'X-Dashboard-Key';
/** 접근 키 최소 길이. 서버 함수에는 시도 횟수 제한이 없어서 짧은 키는 맞혀 볼 수 있다. */
export const MIN_ACCESS_KEY_LENGTH = 16;

export interface ServerTarget {
  id: ServerId;
  /** 요청을 넘길 서버 주소. */
  url: string;
  /** 서버 쪽 조회 경로의 앞부분. */
  path: string;
  headers: Record<string, string>;
}

export interface ApiConfig {
  targets: ServerTarget[];
  /** 대시보드 접근 키. 없거나 너무 짧으면 null이고 모든 요청을 막는다. */
  accessKey: string | null;
  /** 설정이 덜 돼서 생긴 문제. 개발 서버를 켤 때 터미널에 보여 준다. */
  warnings: string[];
}

type Env = Record<string, string | undefined>;

/** 백엔드 운영자 API의 탱글 대시보드 중계 경로. */
const ADMIN_PATH = '/api/v1/admin/tangle/dashboard';
const LOCAL_TANGLE = 'http://127.0.0.1:8010';

const ADMIN_SERVERS = [
  { id: 'dev', label: '개발', url: 'DEV_ADMIN_API_URL', key: 'DEV_ADMIN_KEY' },
  { id: 'prod', label: '운영', url: 'PROD_ADMIN_API_URL', key: 'PROD_ADMIN_KEY' },
] as const;

export const LEGACY_ENV_MESSAGE =
  'ADMIN_API_URL·ADMIN_KEY는 서버별 이름으로 바뀌었다. 개발은 DEV_ADMIN_API_URL·DEV_ADMIN_KEY, 운영은 PROD_ADMIN_API_URL·PROD_ADMIN_KEY로 옮긴다(.env.example 참고).';

/** 예전 이름이 남아 있으면 어느 서버인지 알 수 없으므로 시작하지 않는다. */
export function assertNoLegacyEnv(env: Env): void {
  if (env.ADMIN_API_URL?.trim() || env.ADMIN_KEY?.trim()) throw new Error(LEGACY_ENV_MESSAGE);
}

/**
 * 환경 변수에서 붙을 서버와 접근 키를 정한다. 개발·운영은 주소와 운영자 키가 모두 있을 때만 켠다.
 * 키 없이 보내면 백엔드가 틀린 키로 세고, 실패가 몰리면 맞는 키까지 잠시 막기 때문이다.
 * 로컬 탱글은 TANGLE_SERVER_URL이 있거나, 켜진 백엔드 서버가 하나도 없을 때 기본 주소로 켠다.
 */
export function apiConfig(env: Env): ApiConfig {
  const targets: ServerTarget[] = [];
  const warnings: string[] = [];
  for (const s of ADMIN_SERVERS) {
    const url = env[s.url]?.trim();
    const key = env[s.key]?.trim();
    if (!url) continue;
    if (!key) {
      warnings.push(`${s.key}가 비어 있어 ${s.label} 서버는 연결하지 않는다.`);
      continue;
    }
    targets.push({ id: s.id, url, path: ADMIN_PATH, headers: { 'X-Admin-Key': key } });
  }
  const tangle = env.TANGLE_SERVER_URL?.trim();
  if (tangle || targets.length === 0) {
    const token = env.TANGLE_DASHBOARD_TOKEN?.trim();
    targets.push({
      id: 'local',
      url: tangle || LOCAL_TANGLE,
      path: '/v2/dashboard',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }
  let accessKey = env.DASHBOARD_ACCESS_KEY?.trim() || null;
  if (!accessKey) {
    warnings.push('DASHBOARD_ACCESS_KEY가 비어 있어 모든 조회를 막는다.');
  } else if (accessKey.length < MIN_ACCESS_KEY_LENGTH) {
    warnings.push(`DASHBOARD_ACCESS_KEY가 ${MIN_ACCESS_KEY_LENGTH}자보다 짧아 모든 조회를 막는다.`);
    accessKey = null;
  }
  return { targets, accessKey, warnings };
}

/** 대시보드가 부르는 조회 경로만 넘긴다. 상위 경로(..)나 다른 운영자 API로 새지 않게 모양을 고정한다. */
const ROUTE = /^(runs|sessions|stats|test-runs|(runs|sessions|cases|test-runs)\/[A-Za-z0-9_-]{1,128})$/;
/** 본문을 보내는 경로는 테스트 실행 시작과 중단뿐이다. */
const WRITE_ROUTE = /^test-runs(\/[0-9a-fA-F-]{36}\/stop)?$/;
/** 테스트 실행은 실제 모델을 부르고 테스트 계정을 만든다. 운영 서버에서는 돌리지 않는다. */
const WRITE_SERVERS: readonly ServerId[] = ['dev', 'local'];

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function failure(status: number, code: string, message: string): Response {
  return json(status, { error: { code, message, retryable: false } });
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** 길이와 내용이 다른 키를 같은 시간에 비교한다. */
function sameKey(given: string | null, expected: string): boolean {
  return given !== null && timingSafeEqual(digest(given), digest(expected));
}

export async function handleApi(request: Request, config: ApiConfig, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== '/api/access' && url.pathname !== '/api/dashboard') {
    return failure(404, 'not_found', '없는 경로예요.');
  }
  const write = request.method === 'POST' && url.pathname === '/api/dashboard';
  if (request.method !== 'GET' && !write) return failure(405, 'method_not_allowed', '조회와 테스트 실행만 할 수 있어요.');
  if (!config.accessKey) {
    return failure(503, 'access_not_configured', '대시보드 접근 키(DASHBOARD_ACCESS_KEY)가 서버에 설정되지 않았어요.');
  }
  if (!sameKey(request.headers.get(ACCESS_HEADER), config.accessKey)) {
    return failure(401, 'access_denied', '접근 키가 맞지 않아요.');
  }
  if (url.pathname === '/api/access') {
    return json(200, { servers: config.targets.map((t) => t.id) });
  }

  const params = new URLSearchParams(url.search);
  const server = params.get('server');
  const route = params.get('route') ?? '';
  params.delete('server');
  params.delete('route');
  const target = config.targets.find((t) => t.id === server);
  if (!target) return failure(404, 'unknown_server', '연결되지 않은 서버예요.');
  if (!(write ? WRITE_ROUTE : ROUTE).test(route)) return failure(404, 'not_found', '없는 조회 경로예요.');
  if (write && !WRITE_SERVERS.includes(target.id)) {
    return failure(403, 'test_run_forbidden', '운영 서버에서는 테스트를 실행하지 않아요.');
  }

  const upstream = new URL(`${target.path}/${route}`, target.url);
  upstream.search = params.toString();
  const init: RequestInit = write
    ? { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...target.headers }, body: await request.arrayBuffer() }
    : { headers: { Accept: 'application/json', ...target.headers } };
  let res: Response;
  try {
    res = await fetchImpl(upstream, init);
  } catch {
    return failure(502, 'upstream_unreachable', '서버에 연결하지 못했어요.');
  }
  return new Response(await res.arrayBuffer(), {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function toHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(name, value);
    else if (Array.isArray(value)) headers.set(name, value.join(', '));
  }
  return headers;
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

async function toRequest(req: IncomingMessage, url: string): Promise<Request> {
  const body = req.method === 'POST' ? await readBody(req) : undefined;
  return new Request(new URL(url, 'http://localhost'), { method: req.method, headers: toHeaders(req), body });
}

/** 로컬 개발 서버·미리보기 서버에 끼우는 미들웨어. /api/ 아래 요청만 받고 나머지는 그대로 넘긴다. */
export function nodeMiddleware(config: ApiConfig) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    if (!req.url?.startsWith('/api/')) {
      next();
      return;
    }
    toRequest(req, req.url)
      .then((request) => handleApi(request, config))
      .then(async (response) => {
        res.statusCode = response.status;
        response.headers.forEach((value, name) => res.setHeader(name, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      })
      .catch(() => {
        res.statusCode = 500;
        res.end();
      });
  };
}
