// URL 검색어로 표현하는 화면 상태. 새로고침해도 같은 화면이 열린다.
//   ?run=<turn_id>           실행 인스펙터
//   &from=<test_case_id>     케이스 실행 목록으로 돌아가는 링크
//   ?case=<test_case_id>     케이스 인스펙터
//   ?session=<session_id>    세션 인스펙터. 실행 인스펙터와 함께 있으면 세션으로 돌아가는 링크
//   &replay=1                재생 화면(실행이 열려 있으면 실행, 아니면 세션 재생)
// 테스트 탭(/tests)은 위 패널과 따로 자기 화면 상태를 둔다. 요청 상세를 열어도 남는다.
//   ?tab=results             실행 결과(없으면 테스트 셋)
//   &test_run=<id>           고른 실행(없으면 가장 최근 실행)
//   &test_case=<id>          케이스 결과 화면에서 고른 케이스. 있으면 결과 비교 대신 케이스 결과를 보인다
//   &test_filter=<카테고리>:<값>  케이스 결과 목록을 좁힌 카테고리 값
// 필터(source·status)는 useRunFilters가, 서버(?server=dev|prod|local)는 AppShell이 다룬다.

export interface ViewState {
  run: string | null;
  from: string | null;
  case: string | null;
  session: string | null;
  replay: boolean;
}

const VIEW_KEYS = ['run', 'from', 'case', 'session', 'replay'] as const;

export function readView(params: URLSearchParams): ViewState {
  const run = params.get('run') || null;
  const session = params.get('session') || null;
  return {
    run,
    from: run ? params.get('from') || null : null,
    // 실행·세션 인스펙터가 열려 있으면 케이스 인스펙터는 가린다.
    case: run || session ? null : params.get('case') || null,
    session,
    replay: (!!run || !!session) && params.get('replay') === '1',
  };
}

function write(params: URLSearchParams, next: Partial<Record<(typeof VIEW_KEYS)[number], string | null>>): URLSearchParams {
  const p = new URLSearchParams(params);
  for (const k of VIEW_KEYS) p.delete(k);
  for (const k of VIEW_KEYS) {
    const v = next[k];
    if (v) p.set(k, v);
  }
  return p;
}

export function openRunParams(params: URLSearchParams, runId: string, fromCase?: string | null): URLSearchParams {
  return write(params, { run: runId, from: fromCase ?? null });
}

export function openCaseParams(params: URLSearchParams, caseId: string): URLSearchParams {
  return write(params, { case: caseId });
}

export function openSessionParams(params: URLSearchParams, sessionId: string): URLSearchParams {
  return write(params, { session: sessionId });
}

/** 세션의 턴 하나를 실행 인스펙터로 연다. 세션으로 돌아갈 수 있게 세션 ID를 남긴다. */
export function openTurnParams(params: URLSearchParams, sessionId: string, runId: string): URLSearchParams {
  return write(params, { run: runId, session: sessionId });
}

export function backToSessionParams(params: URLSearchParams): URLSearchParams {
  const v = readView(params);
  return v.session ? write(params, { session: v.session }) : closeParams(params);
}

export function closeParams(params: URLSearchParams): URLSearchParams {
  return write(params, {});
}

export function backToCaseParams(params: URLSearchParams): URLSearchParams {
  const v = readView(params);
  return v.from ? write(params, { case: v.from }) : closeParams(params);
}

export function replayParams(params: URLSearchParams, open: boolean): URLSearchParams {
  const v = readView(params);
  if (!v.run && !v.session) return params;
  return write(params, { run: v.run, from: v.from, session: v.session, replay: open ? '1' : null });
}

export interface TestView {
  tab: 'set' | 'results';
  run: string | null;
  case: string | null;
  filter: { key: string; value: string } | null;
}

const TEST_KEYS = ['tab', 'test_run', 'test_case', 'test_filter'] as const;

export function readTestView(params: URLSearchParams): TestView {
  const [key, value] = (params.get('test_filter') ?? '').split(':');
  return {
    tab: params.get('tab') === 'results' ? 'results' : 'set',
    run: params.get('test_run') || null,
    case: params.get('test_case') || null,
    filter: key && value ? { key, value } : null,
  };
}

/** 테스트 탭의 화면 상태를 통째로 바꾼다. 다른 검색어는 그대로 둔다. */
export function writeTestView(params: URLSearchParams, view: TestView): URLSearchParams {
  const p = new URLSearchParams(params);
  for (const k of TEST_KEYS) p.delete(k);
  if (view.tab === 'results') p.set('tab', 'results');
  if (view.run) p.set('test_run', view.run);
  if (view.case) p.set('test_case', view.case);
  if (view.filter) p.set('test_filter', `${view.filter.key}:${view.filter.value}`);
  return p;
}

/** 다른 화면으로 옮길 때는 필터만 남긴다. */
export function filtersOnly(params: URLSearchParams): URLSearchParams {
  const p = closeParams(params);
  for (const k of TEST_KEYS) p.delete(k);
  return p;
}
