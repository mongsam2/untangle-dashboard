import { describe, expect, it } from 'vitest';
import { activeFilterCount, applyFilter, parseFilters } from './useRunFilters';

const p = (s: string) => new URLSearchParams(s);

describe('필터 파싱', () => {
  it('기본값은 전체', () => {
    expect(parseFilters(p(''))).toEqual({ source: 'all', path: null, status: null });
  });

  it('허용된 값만 읽는다', () => {
    expect(parseFilters(p('source=real&path=accept_direct&status=error'))).toEqual({ source: 'real', path: 'accept_direct', status: 'error' });
    expect(parseFilters(p('source=prod&path=accept&status=warn'))).toEqual({ source: 'all', path: null, status: null });
  });

  it('전체를 고르면 검색어에서 뺀다', () => {
    expect(applyFilter(p('run=x&status=error'), 'status', 'all').toString()).toBe('run=x');
    expect(applyFilter(p(''), 'path', 'model').toString()).toBe('path=model');
  });

  it('켜진 필터 수', () => {
    expect(activeFilterCount(parseFilters(p('source=test&status=normal')))).toBe(2);
  });
});
