import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { RunFilters, RunSource } from './types';

/** 서버가 허용하는 최대 페이지 크기. */
const PAGE_SIZE = 100;

const filterKey = (f: RunFilters) => ({ source: f.source ?? 'all', status: f.status ?? null });

/** 실행 목록(커서 페이지). 첫 페이지의 summary가 필터 조건 전체의 KPI다. */
export function useRuns(filters: RunFilters) {
  return useInfiniteQuery({
    queryKey: ['runs', filterKey(filters)],
    queryFn: ({ pageParam }) => api.listRuns({ ...filters, limit: PAGE_SIZE, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? null,
    placeholderData: keepPreviousData,
  });
}

/** 요약 수치만 필요할 때. 목록은 한 건만 받는다. */
export function useRunSummary(filters: RunFilters) {
  return useQuery({
    queryKey: ['runs-summary', filterKey(filters)],
    queryFn: () => api.listRuns({ ...filters, limit: 1 }),
    select: (r) => r.summary,
    placeholderData: keepPreviousData,
  });
}

export function useRun(turnId: string | null) {
  return useQuery({
    queryKey: ['run', turnId],
    queryFn: () => api.getRun(turnId!),
    enabled: !!turnId,
  });
}

/** 세션 목록(커서 페이지). 마지막 턴이 최근인 세션부터 온다. */
export function useSessions(source: RunSource) {
  return useInfiniteQuery({
    queryKey: ['sessions', source],
    queryFn: ({ pageParam }) => api.listSessions({ source, limit: PAGE_SIZE, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? null,
    placeholderData: keepPreviousData,
  });
}

export function useSession(sessionId: string | null) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.getSession(sessionId!),
    enabled: !!sessionId,
  });
}

export function useCase(testCaseId: string | null) {
  return useQuery({
    queryKey: ['case', testCaseId],
    queryFn: () => api.getCase(testCaseId!),
    enabled: !!testCaseId,
  });
}

export function useStats(filters: RunFilters) {
  return useQuery({
    queryKey: ['stats', filterKey(filters)],
    queryFn: () => api.getStats(filters),
    placeholderData: keepPreviousData,
  });
}
