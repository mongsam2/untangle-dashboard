import { describe, expect, it } from 'vitest';
import { REAL_CONVERSATION_ID } from '../../api/mock/fixtures';
import { createMockHandlers } from '../../api/mock/handlers';
import { addRun, conversationSummary, sourceOfConversation, turnRows } from './conversationModel';

const detail = createMockHandlers().getConversation(REAL_CONVERSATION_ID);

describe('대화 인스펙터의 턴', () => {
  it('턴마다 앞 턴부터 쌓인 합계를 붙인다', () => {
    const rows = turnRows(detail);
    expect(rows.map((r) => r.number)).toEqual([1, 2, 3, 4]);
    expect(rows[0]!.totals.inputTokens).toBe(detail.turns[0]!.run.input_tokens);
    const last = rows.at(-1)!.totals;
    expect(last.inputTokens).toBe(detail.conversation.input_tokens);
    expect(last.modelCalls).toBe(detail.conversation.model_calls);
    expect(last.toolCalls).toBe(detail.conversation.tool_calls);
    expect(last.costUsd).toBeCloseTo(detail.conversation.cost_usd!, 9);
  });

  it('상한 밖이라 뺀 요청이 있으면 순번을 그만큼 밀어 센다', () => {
    const rows = turnRows({ ...detail, turns: detail.turns.slice(2), omitted_turns: 2 });
    expect(rows.map((r) => r.number)).toEqual([3, 4]);
  });

  it('비용은 단가가 있는 턴만 더한다', () => {
    const run = detail.turns[0]!.run;
    const zero = { modelCalls: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: null, durationMs: 0 };
    expect(addRun(zero, { ...run, cost_usd: null }).costUsd).toBeNull();
    expect(addRun(addRun(zero, { ...run, cost_usd: null }), { ...run, cost_usd: 0.5 }).costUsd).toBe(0.5);
  });
});

describe('대화 목록 표기', () => {
  it('출처와 내용 요약', () => {
    expect(sourceOfConversation({ turns: 3, test_turns: 0 })).toBe('real');
    expect(sourceOfConversation({ turns: 3, test_turns: 3 })).toBe('test');
    expect(sourceOfConversation({ turns: 3, test_turns: 1 })).toBe('mixed');
    expect(conversationSummary({ turns: 1, first_input_preview: '안녕', last_input_preview: '안녕' })).toBe('안녕');
    expect(conversationSummary({ turns: 2, first_input_preview: '처음\n둘째 줄', last_input_preview: '제안 수락' })).toBe('처음 → 제안 수락');
    expect(conversationSummary({ turns: 1, first_input_preview: null, last_input_preview: null })).toBe('(입력 없음)');
  });
});
