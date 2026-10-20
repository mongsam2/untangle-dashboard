// 여섯 개의 조회 API를 예시 데이터로 흉내 낸다. 응답 모양은 실제 서버와 같다.
import { ApiError } from '../errors';
import type {
  CaseDetailResponse,
  ConversationDetailResponse,
  ConversationListItem,
  ConversationListResponse,
  ConversationPage,
  RunDetailResponse,
  RunFilters,
  RunListResponse,
  RunPage,
  StatsResponse,
} from '../types';
import {
  CASE_RUN_LIMIT,
  caseStat,
  computeStats,
  CONVERSATION_TURN_LIMIT,
  conversationItem,
  matchesFilters,
  summarize,
} from './aggregate';
import { MOCK_RUNS, MOCK_USER_ID } from './fixtures';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function filterKey(f: RunFilters): string {
  return [f.source ?? 'all', f.path ?? '', f.status ?? ''].join('|');
}

// 대화 목록 커서는 요청 목록 커서와 서명 범위가 달라 서로 바꿔 쓸 수 없다.
function conversationKey(page: ConversationPage): string {
  return 'conversations|' + (page.source ?? 'all');
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

// 서버의 대화 목록 정렬(마지막 요청 시작 DESC, 대화 ID DESC)과 같다.
function byLastActivity(a: ConversationListItem, b: ConversationListItem): number {
  return b.last_started_at.localeCompare(a.last_started_at) || b.conversation_id.localeCompare(a.conversation_id);
}

/** 요청들을 대화별로 묶는다. 각 대화의 요청은 시작 순서다. */
function groupByConversation(data: RunDetailResponse[]): Map<string, RunDetailResponse[]> {
  const groups = new Map<string, RunDetailResponse[]>();
  for (const d of [...data].reverse()) {
    const list = groups.get(d.run.conversation_id) ?? [];
    list.push(d);
    groups.set(d.run.conversation_id, list);
  }
  return groups;
}

// 서버의 정렬(started_at DESC, request_id DESC)과 같다.
function byNewest(a: RunDetailResponse, b: RunDetailResponse): number {
  return b.run.started_at.localeCompare(a.run.started_at) || b.run.request_id.localeCompare(a.run.request_id);
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
      const d = sorted.find((x) => x.run.request_id === id);
      if (!d) throw notFound();
      return d;
    },
    listConversations(page: ConversationPage): ConversationListResponse {
      const limit = page.limit ?? DEFAULT_PAGE_SIZE;
      checkLimit(limit);
      const key = conversationKey(page);
      const groups = groupByConversation(filtered({ source: page.source }));
      const items = [...groups.values()].map((runs) => conversationItem(runs.map((d) => d.run), MOCK_USER_ID)).sort(byLastActivity);
      const offset = page.cursor ? decodeKeyed(page.cursor, key) : 0;
      const next = offset + limit < items.length ? encodeKeyed(offset + limit, key) : null;
      return { items: items.slice(offset, offset + limit), next_cursor: next };
    },
    getConversation(id: string): ConversationDetailResponse {
      const runs = groupByConversation(sorted).get(id);
      if (!runs) throw notFound();
      // 합계는 대화 전체, 요청은 최근 100건이다.
      const shown = runs.slice(-CONVERSATION_TURN_LIMIT);
      return {
        conversation: conversationItem(runs.map((d) => d.run), MOCK_USER_ID),
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
