import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { RunFilters, RunPath, RunSource, RunStatus } from '../../api/types';

const SOURCES: RunSource[] = ['all', 'test', 'real'];
const PATHS: RunPath[] = ['model', 'accept_direct', 'reject_direct'];
const STATUSES: RunStatus[] = ['normal', 'tool_failed', 'outcome_unknown', 'error'];

export interface ParsedFilters {
  source: RunSource;
  path: RunPath | null;
  status: RunStatus | null;
}

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** 알 수 없는 값은 버리고 기본값(전체)으로 읽는다. */
export function parseFilters(params: URLSearchParams): ParsedFilters {
  return {
    source: pick(params.get('source'), SOURCES) ?? 'all',
    path: pick(params.get('path'), PATHS),
    status: pick(params.get('status'), STATUSES),
  };
}

export function applyFilter(params: URLSearchParams, key: keyof RunFilters, value: string | null): URLSearchParams {
  const p = new URLSearchParams(params);
  if (!value || value === 'all') p.delete(key);
  else p.set(key, value);
  return p;
}

export function activeFilterCount(f: ParsedFilters): number {
  return Number(f.source !== 'all') + Number(f.path !== null) + Number(f.status !== null);
}

export function useRunFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const setFilter = useCallback(
    (key: keyof RunFilters, value: string | null) => setParams((p) => applyFilter(p, key, value), { replace: true }),
    [setParams],
  );
  return { filters, setFilter, active: activeFilterCount(filters) };
}
