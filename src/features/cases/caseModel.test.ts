import { describe, expect, it } from 'vitest';
import { createMockHandlers } from '../../api/mock/handlers';
import { caseMeta } from './caseModel';

const h = createMockHandlers();

describe('케이스 머리 수치', () => {
  it('T21: 모델 4회·도구 2회, 반영 미확인 4회', () => {
    const meta = caseMeta(h.getCase('T21'));
    expect(meta.map((m) => [m.label, m.value, !!m.alert])).toEqual([
      ['실행 횟수', '4회', false],
      ['평균 모델 호출', '4.0회', false],
      ['평균 도구 호출', '2.0회', false],
      ['평균 토큰', expect.stringMatching(/^\d{2},\d{3}$/), false],
      ['평균 비용', expect.stringMatching(/^\$0\.\d{4}$/), false],
      ['도구 실패', '0회', false],
      ['반영 미확인', '4회', true],
    ]);
  });

  it('응답 오류가 있으면 칸을 더한다', () => {
    const d = h.getCase('T10');
    expect(caseMeta({ ...d, stats: { ...d.stats, error: 1 } }).at(-1)).toEqual({ label: '응답 오류', value: '1회', alert: true });
  });
});
