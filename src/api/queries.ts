import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useServer } from '../app/connection';
import { apiFor } from './client';
import type { RunFilters, RunSource } from './types';

/** 서버가 허용하는 최대 페이지 크기. */
const PAGE_SIZE = 100;

const filterKey = (f: RunFilters) => ({ source: f.source ?? 'all', status: f.status ?? null });

/** 지금 보는 서버의 API와 캐시 구분값. 모든 조회 키는 서버로 시작해서 서버끼리 캐시가 섞이지 않는다. */
function useApi() {
  const server = useServer();
  return { api: apiFor(server), scope: server ?? 'mock' };
}

/**
 * 필터를 바꾸는 동안 이전 결과를 계속 보여 준다. 서버를 바꾼 경우는 다른 서버의 기록이
 * 잠깐이라도 섞여 보이지 않게 비운다.
 */
function keepWithin(scope: string) {
  return <T>(previous: T | undefined, query: { queryKey: readonly unknown[] } | undefined): T | undefined =>
    query?.queryKey[0] === scope ? previous : undefined;
}

/** 실행 목록(커서 페이지). 첫 페이지의 summary가 필터 조건 전체의 KPI다. */
export function useRuns(filters: RunFilters) {
  const { api, scope } = useApi();
  return useInfiniteQuery({
    queryKey: [scope, 'runs', filterKey(filters)],
    queryFn: ({ pageParam }) => api.listRuns({ ...filters, limit: PAGE_SIZE, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? null,
    placeholderData: keepWithin(scope),
  });
}

/** 요약 수치만 필요할 때. 목록은 한 건만 받는다. */
export function useRunSummary(filters: RunFilters) {
  const { api, scope } = useApi();
  return useQuery({
    queryKey: [scope, 'runs-summary', filterKey(filters)],
    queryFn: () => api.listRuns({ ...filters, limit: 1 }),
    select: (r) => r.summary,
    placeholderData: keepWithin(scope),
  });
}

export function useRun(turnId: string | null) {
  const { api, scope } = useApi();
  return useQuery({
    queryKey: [scope, 'run', turnId],
    queryFn: () => api.getRun(turnId!),
    enabled: !!turnId,
  });
}

/** 세션 목록(커서 페이지). 마지막 턴이 최근인 세션부터 온다. */
export function useSessions(source: RunSource) {
  const { api, scope } = useApi();
  return useInfiniteQuery({
    queryKey: [scope, 'sessions', source],
    queryFn: ({ pageParam }) => api.listSessions({ source, limit: PAGE_SIZE, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? null,
    placeholderData: keepWithin(scope),
  });
}

export function useSession(sessionId: string | null) {
  const { api, scope } = useApi();
  return useQuery({
    queryKey: [scope, 'session', sessionId],
    queryFn: () => api.getSession(sessionId!),
    enabled: !!sessionId,
  });
}

export function useCase(testCaseId: string | null) {
  const { api, scope } = useApi();
  return useQuery({
    queryKey: [scope, 'case', testCaseId],
    queryFn: () => api.getCase(testCaseId!),
    enabled: !!testCaseId,
  });
}

export function useStats(filters: RunFilters) {
  const { api, scope } = useApi();
  return useQuery({
    queryKey: [scope, 'stats', filterKey(filters)],
    queryFn: () => api.getStats(filters),
    placeholderData: keepWithin(scope),
  });
}
