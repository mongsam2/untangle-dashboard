import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { RunFilters, RunListItem } from './types';

const PAGE_SIZE = 100;

const filterKey = (f: RunFilters) => ({ source: f.source ?? 'all', path: f.path ?? null, status: f.status ?? null });

/** 요청 목록(커서 페이지). 첫 페이지의 summary가 필터 조건 전체의 KPI다. */
export function useRuns(filters: RunFilters) {
  return useInfiniteQuery({
    queryKey: ['runs', filterKey(filters)],
    queryFn: ({ pageParam }) => api.listRuns({ ...filters, limit: PAGE_SIZE, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
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

/** 집계 API에 없는 값(캐시 적중률·최대 소요시간·케이스별 평균 모델 호출)을 계산하려고 목록 전체를 받는다. */
export function useAllRuns(filters: RunFilters) {
  return useQuery({
    queryKey: ['runs-all', filterKey(filters)],
    queryFn: async () => {
      const items: RunListItem[] = [];
      let cursor: string | null = null;
      do {
        const page = await api.listRuns({ ...filters, limit: PAGE_SIZE, cursor });
        items.push(...page.items);
        cursor = page.next_cursor;
      } while (cursor);
      return items;
    },
    placeholderData: keepPreviousData,
  });
}

export function useRun(requestId: string | null) {
  return useQuery({
    queryKey: ['run', requestId],
    queryFn: () => api.getRun(requestId!),
    enabled: !!requestId,
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
