import { describe, expect, it } from 'vitest';
import { areaPath, computeKde } from './kde';

describe('computeKde', () => {
  it('표본이 없으면 null', () => {
    expect(computeKde([])).toBeNull();
  });

  it('평균·중앙값·최대·표준편차를 계산하고 곡선은 평균 근처가 높다', () => {
    const k = computeKde([10, 12, 11, 9, 50])!;
    expect(k.n).toBe(5);
    expect(k.mean).toBeCloseTo(18.4);
    expect(k.median).toBe(11);
    expect(k.max).toBe(50);
    const peak = k.xs[k.ys.indexOf(Math.max(...k.ys))]!;
    expect(peak).toBeGreaterThan(5);
    expect(peak).toBeLessThan(20);
  });

  it('path는 닫힌 영역이다', () => {
    const k = computeKde([100, 200])!;
    const d = areaPath(k, 600, 160);
    expect(d.startsWith('M0')).toBe(true);
    expect(d.endsWith('L600 160 L0 160 Z')).toBe(true);
  });
});
