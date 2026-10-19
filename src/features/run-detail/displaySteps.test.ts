import { describe, expect, it } from 'vitest';
import { MOCK_RUNS } from '../../api/mock/fixtures';
import { displaySteps, errorMessageOf, SWAP_NOTE, tokensOf } from './displaySteps';

const byCase = (id: string) => MOCK_RUNS.find((d) => d.run.test_case_id === id)!;

describe('displaySteps', () => {
  it('모델 단계에 순번을 붙인다', () => {
    const d = byCase('T10');
    const steps = displaySteps(d.run, d.steps);
    expect(steps.filter((s) => s.kind === 'model').map((s) => s.modelIndex)).toEqual([1, 2, 3, 4]);
    expect(steps.every((s) => !s.virtual)).toBe(true);
  });

  it('답변을 대체한 요청은 마지막에 서버 판단 카드를 붙인다', () => {
    const d = byCase('T34');
    const steps = displaySteps(d.run, d.steps);
    const last = steps[steps.length - 1]!;
    expect(last).toMatchObject({ kind: 'server', note: SWAP_NOTE, virtual: true, seq: d.steps.length + 1 });
  });

  it('도구 오류 메시지는 결과 객체에서 꺼낸다', () => {
    const d = byCase('T21');
    const unknown = d.steps.find((s) => s.status === 'unknown')!;
    expect(unknown.error_code).toBe('outcome_unknown');
    expect(errorMessageOf(unknown)).toBe('반영 여부를 확인하지 못했어요. 다시 조회해야 해요.');
    expect(errorMessageOf(d.steps[0]!)).toBe('');
  });

  it('토큰 나누기', () => {
    expect(tokensOf({ seq: 1, kind: 'model', started_at: '', duration_ms: 0, input_tokens: 100, cached_tokens: 60, output_tokens: 30, reasoning_tokens: 10 })).toEqual({
      input: 100, cached: 60, output: 30, reasoning: 10, fresh: 40, answer: 20,
    });
  });
});
