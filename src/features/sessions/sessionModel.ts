import type { SessionTurn } from '../../api/types';

export interface Cumulative {
  modelCalls: number;
  toolCalls: number;
  tokens: number;
  cost: number;
  attention: number;
}

export interface TurnRow {
  index: number;
  turn: SessionTurn;
  cum: Cumulative;
}

/** 턴마다 그 턴까지의 누적 합계를 붙인다. 비용이 null인 턴은 0으로 더한다. */
export function turnRows(turns: SessionTurn[], offset = 0): TurnRow[] {
  const cum: Cumulative = { modelCalls: 0, toolCalls: 0, tokens: 0, cost: 0, attention: 0 };
  return turns.map((turn, i) => {
    const r = turn.run;
    cum.modelCalls += r.model_calls;
    cum.toolCalls += r.tool_calls;
    cum.tokens += r.input_tokens + r.output_tokens;
    cum.cost += r.cost_usd ?? 0;
    cum.attention += r.status === 'normal' ? 0 : 1;
    return { index: offset + i + 1, turn, cum: { ...cum } };
  });
}
