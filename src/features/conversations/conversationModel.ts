import type { ConversationDetailResponse, ConversationListItem, ConversationTurn, RunDetailResponse, RunListItem } from '../../api/types';
import { displaySteps, type DisplayStep } from '../run-detail/displaySteps';

/** 앞 턴부터 이 턴까지 쌓인 합계. 비용은 단가가 있는 턴만 더하고, 하나도 없으면 null이다. */
export interface Totals {
  modelCalls: number;
  toolCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  durationMs: number;
}

export interface TurnRow {
  /** 대화 전체에서의 순번(1부터). 상한 밖이라 뺀 요청도 센다. */
  number: number;
  turn: ConversationTurn;
  steps: DisplayStep[];
  totals: Totals;
}

const ZERO: Totals = { modelCalls: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: null, durationMs: 0 };

export function addRun(t: Totals, run: RunListItem): Totals {
  return {
    modelCalls: t.modelCalls + run.model_calls,
    toolCalls: t.toolCalls + run.tool_calls,
    inputTokens: t.inputTokens + run.input_tokens,
    outputTokens: t.outputTokens + run.output_tokens,
    costUsd: run.cost_usd === null ? t.costUsd : (t.costUsd ?? 0) + run.cost_usd,
    durationMs: t.durationMs + run.duration_ms,
  };
}

/** 대화 인스펙터에 쌓을 턴. 합계는 보여 주는 턴부터 센다. */
export function turnRows(detail: ConversationDetailResponse): TurnRow[] {
  let totals = ZERO;
  return detail.turns.map((turn, i) => {
    totals = addRun(totals, turn.run);
    return { number: detail.omitted_turns + i + 1, turn, steps: displaySteps(turn.run, turn.steps), totals };
  });
}

/** 요청 인스펙터의 응답 카드를 그대로 쓰도록 턴을 실행 상세 모양으로 바꾼다. 이전 대화는 위의 턴들이 대신한다. */
export function asRunDetail(turn: ConversationTurn): RunDetailResponse {
  return { run: turn.run, input: turn.input, history: [], response: turn.response, steps: turn.steps };
}

export type ConversationSource = 'test' | 'real' | 'mixed';

export function sourceOfConversation(item: Pick<ConversationListItem, 'turns' | 'test_turns'>): ConversationSource {
  if (item.test_turns === 0) return 'real';
  return item.test_turns === item.turns ? 'test' : 'mixed';
}

/** 목록의 내용 요약: 처음 입력, 턴이 둘 이상이면 마지막 입력을 덧붙인다. */
export function conversationSummary(item: Pick<ConversationListItem, 'turns' | 'first_input_preview' | 'last_input_preview'>): string {
  const first = (item.first_input_preview ?? '').split('\n')[0] || '(입력 없음)';
  if (item.turns < 2) return first;
  const last = (item.last_input_preview ?? '').split('\n')[0] || '(입력 없음)';
  return first + ' → ' + last;
}
