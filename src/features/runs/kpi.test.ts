import { describe, expect, it } from 'vitest';
import { createMockHandlers } from '../../api/mock/handlers';
import { fmtInt } from '../../lib/format';
import { listTiles } from './kpi';
import { summaryOf } from './summary';

const h = createMockHandlers();

describe('요청 목록 KPI', () => {
  it('요약 수치만으로 만든다', () => {
    const tiles = listTiles(h.listRuns({}).summary);
    expect(tiles.map((t) => t.label)).toEqual(['요청 수', '평균 토큰', '총 비용', '도구 실패 비율', '반영 미확인 비율']);
    expect(tiles[0]).toMatchObject({ value: '50', sub: '모델 경유 42건' });
    expect(tiles[3]).toMatchObject({ value: '8.0%', sub: '4건' });
    expect(tiles[4]).toMatchObject({ value: '8.0%', sub: '4건' });
    const items = h.listRuns({ limit: 100 }).items;
    const total = items.reduce((a, r) => a + r.input_tokens + r.output_tokens, 0);
    expect(tiles[1]!.sub).toBe('총 ' + fmtInt(total) + ' 토큰');
  });

  it('비어 있으면 0으로 보인다', () => {
    const tiles = listTiles(undefined);
    expect(tiles[0]!.value).toBe('0');
    expect(tiles[2]!.value).toBe('$0.0000');
    expect(tiles[3]!.value).toBe('0.0%');
  });
});

describe('내용 요약', () => {
  it('테스트는 케이스 제목, 실제 요청은 입력 앞부분', () => {
    const items = h.listRuns({ limit: 100 }).items;
    const t21 = items.find((r) => r.test_case_id === 'T21')!;
    expect(summaryOf(t21)).toBe('저장 결과 unknown 뒤 추가 변경 차단');
    const real = items.find((r) => r.test_case_id === null)!;
    expect(summaryOf(real)).toBe(real.input_preview);
    expect(summaryOf({ ...t21, test_case_id: 'T32' })).toBe('알림 정보 부족·잘못된 값');
  });
});
