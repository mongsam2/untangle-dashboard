import { describe, expect, it } from 'vitest';
import { MOCK_RUNS } from '../../api/mock/fixtures';
import { displaySteps, errorMessageOf, isAttention, modelSteps, stepsDigest, summaryText } from './displaySteps';

const c10 = MOCK_RUNS.find((d) => d.run.test_case_id === 'C10')!;

describe('displaySteps', () => {
  it('모델 호출에 순번을 붙이고 seq 순서로 정렬한다', () => {
    const steps = displaySteps(c10.run, [...c10.steps].reverse());
    expect(steps.map((s) => s.seq)).toEqual(c10.steps.map((s) => s.seq));
    expect(modelSteps(steps).map((s) => s.modelIndex)).toEqual([1, 2, 3]);
  });

  it('차단된 가드레일과 실패한 도구가 주의 단계다', () => {
    const steps = displaySteps(c10.run, c10.steps);
    const attention = steps.filter(isAttention);
    expect(attention.map((s) => s.kind)).toEqual(['guardrail', 'tool']);
    expect(errorMessageOf(attention[1]!)).toContain('INVALID_STATE' === attention[1]!.error_code ? '알림' : '');
    expect(errorMessageOf(attention[1]!)).toContain('changes[0].value');
  });

  it('요약 줄에 모델·도구·가드레일·보정 수가 들어간다', () => {
    expect(stepsDigest(c10.steps)).toBe('모델 3 · 도구 2 · 가드레일 9 (차단 1) · 보정 1');
  });

  it('추론 요약은 번역본을 우선한다', () => {
    const m = c10.steps.find((s) => s.kind === 'model')!;
    expect(summaryText(m)).toBe(m.reasoning_summary_ko);
    expect(summaryText({ ...m, reasoning_summary_ko: null })).toBe(m.reasoning_summary);
  });
});
