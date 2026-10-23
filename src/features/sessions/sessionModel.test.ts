import { describe, expect, it } from 'vitest';
import { createMockHandlers } from '../../api/mock/handlers';
import { MOCK_RUNS } from '../../api/mock/fixtures';
import { turnRows } from './sessionModel';

describe('turnRows', () => {
  it('턴 순서대로 누적 합계를 붙인다', () => {
    const c15 = MOCK_RUNS.find((d) => d.run.test_case_id === 'C15')!;
    const session = createMockHandlers().getSession(c15.run.session_id);
    const rows = turnRows(session.turns, session.omitted_turns);
    expect(rows.map((r) => r.index)).toEqual([1, 2]);
    expect(rows[1]!.cum.modelCalls).toBe(session.turns[0]!.run.model_calls + session.turns[1]!.run.model_calls);
    expect(rows[1]!.cum.tokens).toBe(session.session.input_tokens + session.session.output_tokens);
    expect(rows[1]!.cum.cost).toBeCloseTo(session.session.cost_usd ?? 0, 6);
  });
});
