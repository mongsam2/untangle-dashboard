import { describe, expect, it } from 'vitest';
import { TOOLS } from '../../lib/kinds';
import { CANVAS, docOf, EDGES, GATES, NODES, SHELF, TOOL_CHIPS, TOUR, tourIndex } from './architectureModel';

describe('구조도 데이터', () => {
  it('도구 칩은 설계 문서의 12개와 같고 모두 선반 안에 있다', () => {
    expect(TOOL_CHIPS.map((t) => t.name)).toEqual(TOOLS.map((t) => t.name));
    for (const t of TOOL_CHIPS) {
      expect(t.x).toBeGreaterThanOrEqual(SHELF.x);
      expect(t.y + 40).toBeLessThanOrEqual(SHELF.y + SHELF.h);
    }
  });

  it('노드·가드레일은 캔버스 안에 있고 ID가 겹치지 않는다', () => {
    const ids = [...NODES.map((n) => n.id), ...GATES.map((g) => g.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const n of NODES) {
      expect(n.x + n.w).toBeLessThanOrEqual(CANVAS.width);
      expect(n.y + n.h).toBeLessThanOrEqual(CANVAS.height);
    }
    for (const g of GATES) {
      expect(g.x).toBeLessThanOrEqual(CANVAS.width);
      expect(g.y).toBeLessThanOrEqual(CANVAS.height);
    }
    expect(EDGES.map((e) => e.id)).toHaveLength(new Set(EDGES.map((e) => e.id)).size);
  });

  it('둘러보기 순서는 모든 요소를 한 번씩 거치고 설명을 찾을 수 있다', () => {
    expect(TOUR).toHaveLength(NODES.length + GATES.length + TOOL_CHIPS.length);
    for (const sel of TOUR) {
      expect(docOf(sel).title.length).toBeGreaterThan(0);
      expect(tourIndex(sel)).toBeGreaterThanOrEqual(0);
    }
  });
});
