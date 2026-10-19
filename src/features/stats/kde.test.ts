import { describe, expect, it } from 'vitest';
import { computeKde } from './kde';

describe('KDE', () => {
  it('빈 표본은 기본값', () => {
    const k = computeKde([]);
    expect(k).toMatchObject({ median: '-', line: '', rug: [], ticks: [] });
  });

  it('중앙값·평균·최대와 눈금', () => {
    const k = computeKde([10000, 30000, 20000]);
    expect(k.median).toBe('20,000');
    expect(k.mean).toBe('20,000');
    expect(k.max).toBe('30,000');
    // 상한은 최대값 × 1.1을 1만 단위로 올림 = 40,000
    expect(k.ticks.map((t) => t.label)).toEqual(['0', '8K', '16K', '24K', '32K', '40K']);
    expect(k.medianLine).toBe('M300.0,4 L300.0,180');
    expect(k.rug.map((r) => r.x)).toEqual(['25.00', '50.00', '75.00']);
  });

  it('곡선은 121점이고 가장 높은 점이 위쪽 여백(10)에 닿는다', () => {
    const k = computeKde([15000, 15000, 36000, 34000]);
    const pts = k.line.slice(1).split(' L').map((p) => p.split(',').map(Number));
    expect(pts).toHaveLength(121);
    expect(Math.min(...pts.map((p) => p[1]!))).toBeCloseTo(10, 1);
    expect(pts.every((p) => p[1]! <= 176)).toBe(true);
    expect(k.area.endsWith('L600,180 L0,180 Z')).toBe(true);
  });

  it('짝수 개 중앙값은 가운데 둘의 평균', () => {
    expect(computeKde([1, 2, 3, 4]).median).toBe('3');
  });
});
