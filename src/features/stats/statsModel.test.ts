import { describe, expect, it } from 'vitest';
import { createMockHandlers } from '../../api/mock/handlers';
import { caseRows, guardRows, ringBackground, statusSegs, toolDonuts, toolRows } from './statsModel';

const stats = createMockHandlers().getStats({});

describe('statsModel', () => {
  it('도넛은 종류 비율과 조회·제안 안의 분포를 준다', () => {
    const d = toolDonuts(stats);
    expect(d.map((x) => x.name)).toEqual(['조회 · 제안 · 브리핑 · 기억', '조회 도구 안에서', '제안 도구 안에서']);
    expect(d[0]!.items.map((i) => i.label)).toEqual(['조회 도구', '제안 도구', '브리핑 도구']);
    expect(d[1]!.items.length).toBeLessThanOrEqual(3);
  });

  it('도구 표는 실패율 순·호출 순으로 정렬된다', () => {
    const byRate = toolRows(stats, 'rate');
    expect(byRate[0]!.rate).toBeGreaterThan(0);
    for (let i = 1; i < byRate.length; i += 1) expect(byRate[i - 1]!.rate >= byRate[i]!.rate).toBe(true);
    const byCount = toolRows(stats, 'count');
    for (let i = 1; i < byCount.length; i += 1) expect(byCount[i - 1]!.count >= byCount[i]!.count).toBe(true);
  });

  it('기억 도구도 종류 이름과 색을 받아 도넛과 표에 들어간다', () => {
    const withMemory = {
      ...stats,
      tools: [...stats.tools, { tool_name: 'update_memory', tool_kind: 'memory' as const, calls: 2, failed: 1, avg_duration_ms: 30 }],
      tool_kinds: [...stats.tool_kinds, { value: 'memory', count: 2, ratio: 0.1 }],
    };
    expect(toolDonuts(withMemory)[0]!.items.at(-1)).toMatchObject({ label: '기억 도구', count: '2회', color: 'var(--data-memory)' });
    expect(toolRows(withMemory, 'count').find((r) => r.name === 'update_memory')).toMatchObject({ kind: '기억', color: 'var(--ramp-memory-1)' });
  });

  it('가드레일 표는 층 순서 안에서 차단 많은 순이다', () => {
    const rows = guardRows(stats.guardrails);
    expect(rows[0]!.layer).toBe('입력');
    expect(rows[0]!.blocked).toBeGreaterThan(0);
    expect(rows.at(-1)!.layer).toBe('한도');
  });

  it('상태 비율은 여섯 상태를 정해진 순서로, 없는 상태는 뺀다', () => {
    const segs = statusSegs(stats.statuses);
    expect(segs.map((x) => x.label)).toEqual(['정상', '도구 실패', '입력 차단', '한도 초과', '출력 거부', '서버 오류']);
    expect(statusSegs([{ value: 'error', count: 2, ratio: 1 }]).map((x) => x.label)).toEqual(['서버 오류']);
  });

  it('케이스 표는 주의 건수와 가장 심한 상태를 붙인다', () => {
    const rows = caseRows(stats.cases);
    const c12 = rows.find((r) => r.id === 'C12')!;
    expect(c12.attention).toBe(3);
    expect(c12.worst).toBe('output_rejected');
    expect(rows.find((r) => r.id === 'C01')!.worst).toBeNull();
  });

  it('도넛 배경은 조각 사이에 틈을 둔다', () => {
    expect(ringBackground([{ label: 'a', v: 1, color: 'red' }, { label: 'b', v: 1, color: 'blue' }])).toContain('red 0.00deg 178.80deg');
    expect(ringBackground([])).toBe('var(--data-track)');
  });
});
