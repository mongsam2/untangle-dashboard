// 네 개의 조회 API를 예시 데이터로 흉내 낸다. 응답 모양은 실제 서버와 같다.
import { ApiError } from '../errors';
import type {
  CaseDetailResponse,
  RunDetailResponse,
  RunFilters,
  RunListResponse,
  RunPage,
  StatsResponse,
} from '../types';
import { CASE_RUN_LIMIT, caseStat, computeStats, matchesFilters, summarize } from './aggregate';
import { MOCK_RUNS } from './fixtures';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function filterKey(f: RunFilters): string {
  return [f.source ?? 'all', f.path ?? '', f.status ?? ''].join('|');
}

// 커서는 조회 조건에 묶인다. 조건이 바뀌면 이전 커서는 쓸 수 없다.
export function encodeCursor(offset: number, f: RunFilters): string {
  return btoa(JSON.stringify({ o: offset, k: filterKey(f) }));
}

export function decodeCursor(cursor: string, f: RunFilters): number {
  try {
    const v = JSON.parse(atob(cursor)) as { o: unknown; k: unknown };
    if (typeof v.o === 'number' && v.o >= 0 && v.k === filterKey(f)) return v.o;
  } catch {
    // 아래에서 거절한다.
  }
  throw new ApiError(400, 'invalid_request', '커서가 조회 조건과 맞지 않아요.');
}

function byNewest(a: RunDetailResponse, b: RunDetailResponse): number {
  return b.run.started_at.localeCompare(a.run.started_at) || a.run.request_id.localeCompare(b.run.request_id);
}

export function createMockHandlers(data: RunDetailResponse[] = MOCK_RUNS) {
  const sorted = [...data].sort(byNewest);
  const filtered = (f: RunFilters) => sorted.filter((d) => matchesFilters(d.run, f));
  return {
    listRuns(page: RunPage): RunListResponse {
      const limit = Math.min(Math.max(page.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
      const items = filtered(page).map((d) => d.run);
      const offset = page.cursor ? decodeCursor(page.cursor, page) : 0;
      const slice = items.slice(offset, offset + limit);
      const next = offset + limit < items.length ? encodeCursor(offset + limit, page) : null;
      return { summary: summarize(items), items: slice, next_cursor: next };
    },
    getRun(id: string): RunDetailResponse {
      const d = sorted.find((x) => x.run.request_id === id);
      if (!d) throw new ApiError(404, 'not_found', '실행 기록을 찾을 수 없어요.');
      return d;
    },
    getCase(id: string): CaseDetailResponse {
      const runs = sorted.filter((d) => d.run.test_case_id === id).map((d) => d.run);
      if (!runs.length) throw new ApiError(404, 'not_found', '테스트 케이스 기록을 찾을 수 없어요.');
      // 통계는 전체 실행, 목록은 최근 100건이다.
      return { stats: caseStat(id, runs), runs: runs.slice(0, CASE_RUN_LIMIT) };
    },
    getStats(f: RunFilters): StatsResponse {
      return computeStats(filtered(f));
    },
  };
}
