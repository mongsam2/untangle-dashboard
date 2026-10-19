import { describe, expect, it } from 'vitest';
import { createMockHandlers } from '../../api/mock/handlers';
import { caseRows, ringBackground, shareBlocks, statTiles, toolDonuts, toolRows } from './statsModel';

const h = createMockHandlers();
const stats = h.getStats({});
const all = h.listRuns({ limit: 100 }).items;

describe('도구 집계', () => {
  it('세 도넛: 조회·변경, 조회 안, 변경 안', () => {
    const [kinds, q, m] = toolDonuts(stats);
    expect(kinds!.items.map((i) => i.label)).toEqual(['조회 도구', '변경 도구']);
    expect(kinds!.total).toBe(q!.total + m!.total);
    expect(q!.items[0]).toMatchObject({ label: 'search_goals', count: '34회' });
    expect(q!.items[0]!.color).toBe('var(--ramp-query-1)');
    expect(m!.mono).toBe(true);
  });

  it('조각 하나면 틈이 없고, 비면 회색', () => {
    expect(ringBackground([])).toBe('var(--color-divider)');
    expect(ringBackground([{ label: 'a', v: 3, color: 'red' }])).toBe('conic-gradient(red 0.00deg 360.00deg, var(--color-canvas) 360.00deg 360.00deg)');
  });

  it('실패율 순 정렬: unknown도 실패로 센다', () => {
    const rows = toolRows(stats, 'rate');
    expect(rows[0]).toMatchObject({ name: 'set_goal_reminder', fails: 4, rate: 1 });
    expect(rows.find((r) => r.name === 'set_completion')).toMatchObject({ count: 8, fails: 4, rate: 0.5 });
    const byCount = toolRows(stats, 'count');
    expect(byCount[0]!.name).toBe('search_goals');
  });
});

describe('비율·케이스·KPI', () => {
  it('상태 비율에 응답 오류가 들어간다', () => {
    const [paths, statuses] = shareBlocks(stats);
    expect(paths!.segs.map((s) => s.label)).toEqual(['모델', '수락 직행', '거절 직행']);
    expect(statuses!.segs.map((s) => s.label)).toEqual(['정상', '도구 실패', '반영 미확인', '응답 오류']);
    expect(statuses!.segs[3]!.value).toBe('2건 · 4%');
  });

  it('케이스 표: 케이스 ID 순, 제목과 평균 모델 호출', () => {
    const rows = caseRows(stats.cases);
    expect(rows.map((r) => r.id)).toEqual([...rows.map((r) => r.id)].sort());
    expect(rows.find((r) => r.id === 'T10')).toMatchObject({ title: '전체 로드맵과 첫 과제 추천', runs: 4, avgModel: '4.0' });
    expect(rows.find((r) => r.id === 'T20')!.avgModel).toBe('0.0');
    expect(rows.find((r) => r.id === 'T21')).toMatchObject({ unknown: 4, warn: 0 });
  });

  it('집계 KPI', () => {
    const tiles = statTiles(h.listRuns({}).summary);
    expect(tiles.map((t) => t.label)).toEqual(['평균 모델 호출', '평균 도구 호출', '캐시 적중률', '평균 소요시간']);
    const models = all.reduce((a, r) => a + r.model_calls, 0);
    expect(tiles[0]!.sub).toBe('총 ' + models + '회');
    const input = all.reduce((a, r) => a + r.input_tokens, 0);
    const cached = all.reduce((a, r) => a + r.cached_tokens, 0);
    expect(tiles[2]!.value).toBe(((cached / input) * 100).toFixed(1) + '%');
    expect(tiles[3]!.sub).toBe('최대 29.7s');
  });
});
