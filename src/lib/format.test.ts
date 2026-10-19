import { describe, expect, it } from 'vitest';
import { fmtCost, fmtDateTime, fmtDeadline, fmtInt, fmtMs, fmtPct, fmtSec, fmtStamp, fmtTime, shortId } from './format';

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

  it('목록 시각: 오늘은 시각만, 지난 날은 날짜를 붙인다', () => {
    const now = Date.parse('2026-10-19T09:00:00Z'); // 한국 시간 18:00
    expect(fmtStamp('2026-10-19T08:52:13Z', now)).toBe('17:52:13');
    expect(fmtStamp('2026-10-18T08:52:13Z', now)).toBe('10/18 17:52');
    // 한국 날짜 기준: UTC로는 같은 날이어도 한국에서는 전날이다.
    expect(fmtStamp('2026-10-18T14:59:00Z', Date.parse('2026-10-18T15:01:00Z'))).toBe('10/18 23:59');
  });

  it('UUID는 앞 8자리만', () => {
    expect(shortId('27163b40-0425-599d-8a4e-0123456789ab')).toBe('27163b40…');
    expect(shortId('c-12')).toBe('c-12');
  });

  it('비율', () => {
    expect(fmtPct(0.1234)).toBe('12.3%');
    expect(fmtPct(0.5, 0)).toBe('50%');
  });
});
