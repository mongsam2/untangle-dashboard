import { describe, expect, it } from 'vitest';
import { fmtCost, fmtDateTime, fmtDeadline, fmtInt, fmtMs, fmtPct, fmtSec, fmtTime } from './format';

describe('format', () => {
  it('정수는 한국식 천 단위 구분', () => {
    expect(fmtInt(12345.6)).toBe('12,346');
    expect(fmtInt(0)).toBe('0');
  });

  it('비용은 네 자리, 없으면 -', () => {
    expect(fmtCost(0.012345)).toBe('$0.0123');
    expect(fmtCost(null)).toBe('-');
  });

  it('소요시간은 1초 미만 ms, 이상은 소수 한 자리 초', () => {
    expect(fmtMs(999)).toBe('999ms');
    expect(fmtMs(1000)).toBe('1.0s');
    expect(fmtMs(9123.4)).toBe('9.1s');
  });

  it('재생용 초 표기는 짧을수록 자릿수를 늘린다', () => {
    expect(fmtSec(40)).toBe('0.040s');
    expect(fmtSec(450)).toBe('0.45s');
    expect(fmtSec(1900)).toBe('1.9s');
  });

  it('시각은 한국 시간으로 표기한다', () => {
    expect(fmtTime('2026-10-19T08:52:13Z')).toBe('17:52:13');
    expect(fmtDateTime('2026-10-19T15:05:00Z')).toBe('10월 20일 00:05:00');
    expect(fmtDeadline('2026-10-31T23:59:00+09:00')).toBe('10월 31일 23:59');
  });

  it('비율', () => {
    expect(fmtPct(0.1234)).toBe('12.3%');
    expect(fmtPct(0.5, 0)).toBe('50%');
  });
});
