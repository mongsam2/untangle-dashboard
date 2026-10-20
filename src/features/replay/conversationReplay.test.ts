import { describe, expect, it } from 'vitest';
import { REAL_CONVERSATION_ID } from '../../api/mock/fixtures';
import { createMockHandlers } from '../../api/mock/handlers';
import type { ConversationTurn } from '../../api/types';
import { buildConversationView, conversationScriptOf, conversationTimeline, historyOf, turnAt } from './conversationReplay';
import { advance, durationOf, RP_ANIM, RP_HOLD, RP_REPLY_HOLD, seekIn } from './replayModel';

const detail = createMockHandlers().getConversation(REAL_CONVERSATION_ID);
const s = conversationScriptOf(detail);
const t = conversationTimeline(s);

describe('대화 박자', () => {
  it('턴마다 사용자 입력 → 단계 → 응답 전송이 이어진다', () => {
    expect(s.turns).toHaveLength(4);
    expect(s.turns[0]!.start).toBe(0);
    s.turns.forEach((ts, i) => {
      expect(ts.number).toBe(i + 1);
      expect(ts.end - ts.start).toBe(ts.steps.length + 1);
      if (i > 0) expect(ts.start).toBe(s.turns[i - 1]!.end + 1);
    });
    expect(s.last).toBe(s.turns[3]!.end);
    expect(turnAt(s, s.turns[1]!.start)).toBe(1);
    expect(turnAt(s, s.turns[0]!.end)).toBe(0);
  });

  it('응답 전송 뒤에는 다음 턴 전에 읽는 텀을 둔다', () => {
    const end = s.turns[0]!.end;
    expect(advance({ idx: end, phase: 'anim', playing: true }, t)!.delay).toBe(RP_ANIM);
    expect(advance({ idx: end, phase: 'done', playing: true }, t)).toEqual({ delay: RP_REPLY_HOLD, next: { idx: end + 1, phase: 'anim', playing: true } });
    expect(advance({ idx: 1, phase: 'done', playing: true }, t)!.delay).toBe(RP_HOLD);
    expect(durationOf(t)).toBe((s.last + 1) * RP_ANIM + s.last * RP_HOLD + 3 * (RP_REPLY_HOLD - RP_HOLD));
  });
});

describe('대화 재생 화면', () => {
  it('다음 턴으로 넘어가도 앞 턴의 단계와 누적 수치가 남는다', () => {
    const first = s.turns[0]!;
    const view = buildConversationView(s, seekIn(s.turns[1]!.start, t));
    expect(view.turnNumber).toBe(2);
    expect(view.history.map((h) => h.role)).toEqual(['user', 'assistant']);
    expect(view.history[0]!.text).toBe('오늘 뭐부터 하면 좋을까?');
    expect(view.userShown).toBe(true);
    expect(view.typing).toBe(false);
    expect(view.finalShown).toBe(false);
    expect(view.cards).toHaveLength(first.steps.length + 1);
    expect(view.cards.at(-1)).toMatchObject({ key: '1-final', kind: 'final', title: '턴 1 응답 전송', current: false });
    expect(view.cumIn).toBe(first.turn.run.input_tokens);
    expect(view.cumOut).toBe(first.turn.run.output_tokens);
  });

  it('끝까지 가면 모든 턴의 단계와 대화 합계가 쌓인다', () => {
    const view = buildConversationView(s, seekIn(s.last, t));
    expect(view.cards).toHaveLength(s.turns.reduce((a, ts) => a + ts.steps.length + 1, 0));
    expect(view.cumIn).toBe(detail.conversation.input_tokens);
    expect(view.cumOut).toBe(detail.conversation.output_tokens);
    expect(view.history).toHaveLength(6);
    expect(view.finalShown).toBe(true);
    expect(view.ended).toBe(true);
    expect(view.markers).toHaveLength(s.last + 1);
    expect(view.markers[0]!.title).toBe('1단계 · 턴 1 · 사용자 입력');
    expect(view.pos).toBe(s.last + 1 + ' / ' + (s.last + 1));
  });

  it('지난 턴: 버튼 입력은 버튼 말풍선, 응답 없이 끝난 턴은 사용자 말만', () => {
    const base = detail.turns[0]!;
    const accept: ConversationTurn = { ...base, input: { type: 'proposal_accept', proposal_id: 'p-1' } };
    expect(historyOf(accept)[0]).toEqual({ role: 'user', text: '[제안 수락]' });
    expect(historyOf({ ...base, response: null })).toHaveLength(1);
  });
});
