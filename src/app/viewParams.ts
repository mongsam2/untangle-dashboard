// URL 검색어로 표현하는 화면 상태. 새로고침해도 같은 화면이 열린다.
//   ?run=<request_id>         요청 인스펙터
//   &from=<test_case_id>      케이스 실행 목록으로 돌아가는 링크
//   ?case=<test_case_id>      케이스 인스펙터
//   &replay=1                 재생 화면
// 필터(source·path·status)는 useRunFilters가 다룬다.

export interface ViewState {
  run: string | null;
  from: string | null;
  case: string | null;
  replay: boolean;
}

const VIEW_KEYS = ['run', 'from', 'case', 'replay'] as const;

export function readView(params: URLSearchParams): ViewState {
  const run = params.get('run') || null;
  return {
    run,
    from: run ? params.get('from') || null : null,
    // 요청 인스펙터가 열려 있으면 케이스 인스펙터는 가린다.
    case: run ? null : params.get('case') || null,
    replay: !!run && params.get('replay') === '1',
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

export function closeParams(params: URLSearchParams): URLSearchParams {
  return write(params, {});
}

export function backToCaseParams(params: URLSearchParams): URLSearchParams {
  const v = readView(params);
  return v.from ? write(params, { case: v.from }) : closeParams(params);
}

export function replayParams(params: URLSearchParams, open: boolean): URLSearchParams {
  const v = readView(params);
  if (!v.run) return params;
  return write(params, { run: v.run, from: v.from, replay: open ? '1' : null });
}

/** 다른 화면으로 옮길 때는 필터만 남긴다. */
export function filtersOnly(params: URLSearchParams): URLSearchParams {
  return closeParams(params);
}
