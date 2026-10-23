// 여섯 개의 조회 API를 예시 데이터로 흉내 낸다. 응답 모양은 실제 서버와 같다.
import { ApiError } from '../errors';
import type {
  CaseDetailResponse,
  RunDetailResponse,
  RunFilters,
  RunListResponse,
  RunPage,
  SessionDetailResponse,
  SessionListItem,
  SessionListResponse,
  SessionPage,
  StatsResponse,
} from '../types';
import { CASE_RUN_LIMIT, caseStat, computeStats, matchesFilters, SESSION_TURN_LIMIT, sessionItem, summarize } from './aggregate';
import { MOCK_RUNS } from './fixtures';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function filterKey(f: RunFilters): string {
  return ['runs', f.source ?? 'all', f.status ?? ''].join('|');
}

// 세션 목록 커서는 실행 목록 커서와 서명 범위가 달라 서로 바꿔 쓸 수 없다.
function sessionKey(page: SessionPage): string {
  return 'sessions|' + (page.source ?? 'all');
}

// 커서는 조회 조건에 묶인다. 조건이 바뀌면 이전 커서는 쓸 수 없다.
export function encodeCursor(offset: number, f: RunFilters): string {
  return encodeKeyed(offset, filterKey(f));
}

export function decodeCursor(cursor: string, f: RunFilters): number {
  return decodeKeyed(cursor, filterKey(f));
}

function encodeKeyed(offset: number, key: string): string {
  return btoa(JSON.stringify({ o: offset, k: key }));
}

function decodeKeyed(cursor: string, key: string): number {
  try {
    const v = JSON.parse(atob(cursor)) as { o: unknown; k: unknown };
    if (typeof v.o === 'number' && v.o >= 0 && v.k === key) return v.o;
  } catch {
    // 아래에서 거절한다.
  }
  throw new ApiError(422, 'invalid_request', '조회 커서가 유효하지 않아요.');
}

function checkLimit(limit: number): void {
  // 서버는 범위를 벗어난 limit을 고치지 않고 거절한다.
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new ApiError(422, 'invalid_request', '요청 형식이 올바르지 않아요.');
  }
}

// 서버의 세션 목록 정렬(마지막 턴 시작 DESC, 세션 ID DESC)과 같다.
function byLastActivity(a: SessionListItem, b: SessionListItem): number {
  return b.last_started_at.localeCompare(a.last_started_at) || b.session_id.localeCompare(a.session_id);
}

/** 실행들을 세션별로 묶는다. 각 세션의 턴은 시작 순서다. */
function groupBySession(data: RunDetailResponse[]): Map<string, RunDetailResponse[]> {
  const groups = new Map<string, RunDetailResponse[]>();
  for (const d of [...data].reverse()) {
    const list = groups.get(d.run.session_id) ?? [];
    list.push(d);
    groups.set(d.run.session_id, list);
  }
  return groups;
}

// 서버의 정렬(started_at DESC, turn_id DESC)과 같다.
function byNewest(a: RunDetailResponse, b: RunDetailResponse): number {
  return b.run.started_at.localeCompare(a.run.started_at) || b.run.turn_id.localeCompare(a.run.turn_id);
}

const notFound = () => new ApiError(404, 'not_found', '대상을 찾을 수 없어요.');

export function createMockHandlers(data: RunDetailResponse[] = MOCK_RUNS) {
  const sorted = [...data].sort(byNewest);
  const filtered = (f: RunFilters) => sorted.filter((d) => matchesFilters(d.run, f));
  return {
    listRuns(page: RunPage): RunListResponse {
      const limit = page.limit ?? DEFAULT_PAGE_SIZE;
      checkLimit(limit);
      const items = filtered(page).map((d) => d.run);
      const offset = page.cursor ? decodeCursor(page.cursor, page) : 0;
      const slice = items.slice(offset, offset + limit);
      const next = offset + limit < items.length ? encodeCursor(offset + limit, page) : null;
      return { summary: summarize(items), items: slice, next_cursor: next };
    },
    getRun(id: string): RunDetailResponse {
      const d = sorted.find((x) => x.run.turn_id === id);
      if (!d) throw notFound();
      return d;
    },
    listSessions(page: SessionPage): SessionListResponse {
      const limit = page.limit ?? DEFAULT_PAGE_SIZE;
      checkLimit(limit);
      const key = sessionKey(page);
      const groups = groupBySession(filtered({ source: page.source }));
      const items = [...groups.values()].map((runs) => sessionItem(runs.map((d) => d.run))).sort(byLastActivity);
      const offset = page.cursor ? decodeKeyed(page.cursor, key) : 0;
      const next = offset + limit < items.length ? encodeKeyed(offset + limit, key) : null;
      return { items: items.slice(offset, offset + limit), next_cursor: next };
    },
    getSession(id: string): SessionDetailResponse {
      const runs = groupBySession(sorted).get(id);
      if (!runs) throw notFound();
      // 합계는 세션 전체, 턴은 최근 100건이다.
      const shown = runs.slice(-SESSION_TURN_LIMIT);
      return {
        session: sessionItem(runs.map((d) => d.run)),
        turns: shown.map((d) => ({ run: d.run, input: d.input, response: d.response, steps: d.steps })),
        omitted_turns: runs.length - shown.length,
      };
    },
    getCase(id: string): CaseDetailResponse {
      const runs = sorted.filter((d) => d.run.test_case_id === id).map((d) => d.run);
      if (!runs.length) throw notFound();
      // 통계는 전체 실행, 목록은 최근 100건이다.
      return { stats: caseStat(id, runs), runs: runs.slice(0, CASE_RUN_LIMIT) };
    },
    getStats(f: RunFilters): StatsResponse {
      return computeStats(filtered(f));
    },
  };
}
