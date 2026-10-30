import { describe, expect, it, vi } from 'vitest';
import { SERVER_IDS as APP_SERVER_IDS } from '../src/api/servers';
import { apiConfig, assertNoLegacyEnv, handleApi, SERVER_IDS, type ApiConfig } from './dashboardApi';

const ACCESS = 'team-dashboard-access-key';

const ENV = {
  DASHBOARD_ACCESS_KEY: ACCESS,
  DEV_ADMIN_API_URL: 'https://dev.example.com',
  DEV_ADMIN_KEY: 'dev-admin',
  PROD_ADMIN_API_URL: 'https://prod.example.com',
  PROD_ADMIN_KEY: 'prod-admin',
};

function request(path: string, key: string | null = ACCESS, method = 'GET', body?: string): Request {
  return new Request('https://dash.example.com' + path, { method, headers: key === null ? {} : { 'X-Dashboard-Key': key }, body });
}

const RUN_ID = '0b5c1d3e-8f2a-4c1b-9d7e-6a5b4c3d2e1f';

function upstream(status = 200, body: unknown = { items: [] }) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as { error: { code: string } }).error.code;
}

describe('apiConfig', () => {
  it('화면과 서버 함수가 같은 서버 목록을 쓴다', () => {
    expect([...SERVER_IDS]).toEqual([...APP_SERVER_IDS]);
  });

  it('주소와 운영자 키가 모두 있는 서버만 켠다', () => {
    const config = apiConfig(ENV);
    expect(config.targets.map((t) => t.id)).toEqual(['dev', 'prod']);
    expect(config.targets[1]!.headers).toEqual({ 'X-Admin-Key': 'prod-admin' });
    expect(config.accessKey).toBe(ACCESS);

    const noProdKey = apiConfig({ ...ENV, PROD_ADMIN_KEY: '' });
    expect(noProdKey.targets.map((t) => t.id)).toEqual(['dev']);
    expect(noProdKey.warnings.some((w) => w.includes('PROD_ADMIN_KEY'))).toBe(true);
  });

  it('백엔드 서버가 없으면 로컬 탱글 서버에 직접 붙는다', () => {
    const config = apiConfig({ DASHBOARD_ACCESS_KEY: ACCESS, TANGLE_DASHBOARD_TOKEN: 'tangle-token' });
    expect(config.targets).toEqual([
      { id: 'local', url: 'http://127.0.0.1:8010', path: '/v2/dashboard', headers: { Authorization: 'Bearer tangle-token' } },
    ]);
  });

  it('접근 키가 없거나 짧으면 비워 둔다', () => {
    expect(apiConfig({ ...ENV, DASHBOARD_ACCESS_KEY: '' }).accessKey).toBeNull();
    expect(apiConfig({ ...ENV, DASHBOARD_ACCESS_KEY: 'short' }).accessKey).toBeNull();
  });

  it('예전 변수 이름이 남아 있으면 시작하지 않는다', () => {
    expect(() => assertNoLegacyEnv({ ADMIN_API_URL: 'https://dev.example.com' })).toThrow('DEV_ADMIN_API_URL');
    expect(() => assertNoLegacyEnv(ENV)).not.toThrow();
  });
});

describe('handleApi', () => {
  const config: ApiConfig = apiConfig(ENV);

  it('접근 키가 맞으면 연결된 서버 목록을 준다', async () => {
    const res = await handleApi(request('/api/access'), config);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ servers: ['dev', 'prod'] });
  });

  it('접근 키가 없거나 틀리면 401이고 서버로 보내지 않는다', async () => {
    const fetchImpl = upstream();
    for (const key of [null, 'wrong-key', ACCESS.toUpperCase(), ACCESS + 'x']) {
      const res = await handleApi(request('/api/dashboard?server=dev&route=runs', key), config, fetchImpl);
      expect(res.status).toBe(401);
      expect(await errorCode(res)).toBe('access_denied');
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('접근 키가 설정되지 않은 배포는 모두 막는다', async () => {
    const res = await handleApi(request('/api/access'), { ...config, accessKey: null });
    expect(res.status).toBe(503);
    expect(await errorCode(res)).toBe('access_not_configured');
  });

  it('고른 서버의 운영자 API로 조회 조건과 함께 중계한다', async () => {
    const fetchImpl = upstream(200, { items: [{ turn_id: 't1' }] });
    const res = await handleApi(request('/api/dashboard?server=prod&route=runs&source=real&limit=1'), config, fetchImpl);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [{ turn_id: 't1' }] });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe('https://prod.example.com/api/v1/admin/tangle/dashboard/runs?source=real&limit=1');
    expect(init?.headers).toMatchObject({ 'X-Admin-Key': 'prod-admin' });
  });

  it('테스트 실행 목록과 실행 하나를 조회한다', async () => {
    const fetchImpl = upstream();
    for (const route of ['test-runs', `test-runs/${RUN_ID}`]) {
      expect((await handleApi(request(`/api/dashboard?server=dev&route=${route}`), config, fetchImpl)).status).toBe(200);
    }
    expect(fetchImpl.mock.calls.map(([url]) => String(url))).toEqual([
      'https://dev.example.com/api/v1/admin/tangle/dashboard/test-runs',
      `https://dev.example.com/api/v1/admin/tangle/dashboard/test-runs/${RUN_ID}`,
    ]);
  });

  it('테스트 실행 시작·중단은 본문을 그대로 POST로 중계한다', async () => {
    const fetchImpl = upstream(200, { id: RUN_ID });
    const body = JSON.stringify({ case_ids: ['C001'], repeats: 1 });
    const res = await handleApi(request('/api/dashboard?server=dev&route=test-runs', ACCESS, 'POST', body), config, fetchImpl);
    expect(res.status).toBe(200);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe('https://dev.example.com/api/v1/admin/tangle/dashboard/test-runs');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json', 'X-Admin-Key': 'dev-admin' });
    expect(new TextDecoder().decode(init?.body as ArrayBuffer)).toBe(body);

    const local = apiConfig({ DASHBOARD_ACCESS_KEY: ACCESS, TANGLE_DASHBOARD_TOKEN: 'tangle-token' });
    await handleApi(request(`/api/dashboard?server=local&route=test-runs/${RUN_ID}/stop`, ACCESS, 'POST', '{}'), local, fetchImpl);
    expect(String(fetchImpl.mock.calls[1]![0])).toBe(`http://127.0.0.1:8010/v2/dashboard/test-runs/${RUN_ID}/stop`);
  });

  it('운영 서버로는 테스트 실행을 보내지 않고, 시작·중단 밖의 POST는 넘기지 않는다', async () => {
    const fetchImpl = upstream();
    const prod = await handleApi(request('/api/dashboard?server=prod&route=test-runs', ACCESS, 'POST', '{}'), config, fetchImpl);
    expect(prod.status).toBe(403);
    expect(await errorCode(prod)).toBe('test_run_forbidden');
    for (const route of ['runs', 'stats', `test-runs/${RUN_ID}`, 'test-runs/1/stop', `test-runs/${RUN_ID}/stop/x`]) {
      const res = await handleApi(request(`/api/dashboard?server=dev&route=${route}`, ACCESS, 'POST', '{}'), config, fetchImpl);
      expect(res.status, route).toBe(404);
    }
    expect((await handleApi(request(`/api/dashboard?server=dev&route=test-runs/${RUN_ID}/stop`), config, fetchImpl)).status).toBe(404);
    const denied = await handleApi(request('/api/dashboard?server=dev&route=test-runs', 'wrong-key', 'POST', '{}'), config, fetchImpl);
    expect(denied.status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('서버의 오류 상태와 본문은 그대로 돌려준다', async () => {
    const body = { error: { code: 'not_found', message: '없는 실행이에요.', retryable: false } };
    const res = await handleApi(request('/api/dashboard?server=dev&route=runs/0f0f0f0f-0000-4000-8000-000000000001'), config, upstream(404, body));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual(body);
  });

  it('정해진 조회 경로 밖과 연결되지 않은 서버는 넘기지 않는다', async () => {
    const fetchImpl = upstream();
    const cases: [string, string][] = [
      ['/api/dashboard?server=dev&route=../../users', 'not_found'],
      ['/api/dashboard?server=dev&route=runs/../../users', 'not_found'],
      ['/api/dashboard?server=dev&route=overview', 'not_found'],
      ['/api/dashboard?server=local&route=runs', 'unknown_server'],
      ['/api/dashboard?route=runs', 'unknown_server'],
      ['/api/other', 'not_found'],
    ];
    for (const [path, code] of cases) {
      const res = await handleApi(request(path), config, fetchImpl);
      expect(res.status).toBe(404);
      expect(await errorCode(res)).toBe(code);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('조회·테스트 실행이 아니면 405, 서버에 닿지 못하면 502다', async () => {
    expect((await handleApi(request('/api/access', ACCESS, 'POST'), config)).status).toBe(405);
    expect((await handleApi(request('/api/dashboard?server=dev&route=test-runs', ACCESS, 'PUT'), config)).status).toBe(405);
    const down = vi.fn<typeof fetch>(async () => {
      throw new TypeError('fetch failed');
    });
    const res = await handleApi(request('/api/dashboard?server=dev&route=stats'), config, down);
    expect(res.status).toBe(502);
    expect(await errorCode(res)).toBe('upstream_unreachable');
  });
});
