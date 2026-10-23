import { describe, expect, it } from 'vitest';
import { activeFilterCount, applyFilter, parseFilters } from './useRunFilters';

describe('parseFilters', () => {
  it('허용된 값만 읽고 나머지는 전체로 본다', () => {
    expect(parseFilters(new URLSearchParams('source=test&status=blocked_input'))).toEqual({ source: 'test', status: 'blocked_input' });
    expect(parseFilters(new URLSearchParams('source=nope&status=outcome_unknown'))).toEqual({ source: 'all', status: null });
  });

  it('전체를 고르면 검색어에서 지운다', () => {
    const p = applyFilter(new URLSearchParams('status=error&run=r1'), 'status', 'all');
    expect(p.toString()).toBe('run=r1');
    expect(activeFilterCount(parseFilters(applyFilter(p, 'source', 'real')))).toBe(1);
  });
});
