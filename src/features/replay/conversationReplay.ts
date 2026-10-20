import type { ConversationDetailResponse, ConversationTurn, HistoryMessage } from '../../api/types';
import { fmtCost, fmtSec } from '../../lib/format';
import { inputText } from '../../lib/input';
import { displaySteps, type DisplayStep } from '../run-detail/displaySteps';
import {
  endedIn,
  finalTextOf,
  RP_ANIM,
  RP_HOLD,
  RP_REPLY_HOLD,
  stepBeat,
  stepCard,
  type ReplayCard,
  type ReplayState,
  type ReplayView,
  type Timeline,
} from './replayModel';

// 대화 재생: 턴마다 사용자 입력 → 단계들 → 응답 전송 박자를 이어 붙인다.
// 앞 턴의 단계 카드와 누적 토큰·비용은 지우지 않고 계속 쌓는다.

export interface TurnScript {
  turn: ConversationTurn;
  /** 대화 전체에서의 순번(1부터). 상한 밖이라 뺀 요청도 센다. */
  number: number;
  steps: DisplayStep[];
  /** 이 턴의 사용자 입력 박자 번호 */
  start: number;
  /** 이 턴의 응답 전송 박자 번호 */
  end: number;
}

export interface ConversationScript {
  turns: TurnScript[];
  last: number;
}

export function conversationScriptOf(detail: ConversationDetailResponse): ConversationScript {
  let idx = 0;
  const turns = detail.turns.map((turn, i) => {
    const steps = displaySteps(turn.run, turn.steps);
    const start = idx;
    const end = start + steps.length + 1;
    idx = end + 1;
    return { turn, number: detail.omitted_turns + i + 1, steps, start, end };
  });
  return { turns, last: Math.max(0, idx - 1) };
}

/** 턴 안의 박자는 요청 재생과 같고, 응답 전송 뒤에는 다음 턴 전에 읽는 텀을 둔다. */
export function conversationTimeline(s: ConversationScript): Timeline {
  const ends = new Set(s.turns.map((t) => t.end));
  return { last: s.last, delays: (idx) => ({ anim: RP_ANIM, hold: ends.has(idx) ? RP_REPLY_HOLD : RP_HOLD }) };
}

/** 박자가 속한 턴의 위치(0부터). */
export function turnAt(s: ConversationScript, idx: number): number {
  const i = s.turns.findIndex((t) => idx <= t.end);
  return i === -1 ? s.turns.length - 1 : i;
}

/** 앱 대화창에 남는 지난 턴. 버튼 입력은 누른 버튼 말풍선, 응답 없이 끝난 턴은 사용자 말만 남는다. */
export function historyOf(turn: ConversationTurn): HistoryMessage[] {
  const input = turn.input;
  const user: HistoryMessage = {
    role: 'user',
    text: input.type === 'message' ? input.text : input.type === 'proposal_accept' ? '[제안 수락]' : '[제안 거절]',
  };
  if (!turn.response) return [user];
  return [user, { role: 'assistant', text: finalTextOf(turn).text }];
}

export interface ConversationReplayView extends ReplayView {
  turnNumber: number;
  userText: string;
  finalText: string;
  options: string[];
}

export function buildConversationView(s: ConversationScript, p: ReplayState): ConversationReplayView {
  const t = turnAt(s, p.idx);
  const cur = s.turns[t]!;
  const passed = (i: number) => i < p.idx || (i === p.idx && p.phase === 'done');
  const cards: ReplayCard[] = [];
  let cumIn = 0;
  let cumOut = 0;
  let cumCost = 0;
  for (const ts of s.turns) {
    ts.steps.forEach((st, j) => {
      const i = ts.start + 1 + j;
      if (st.kind === 'model' && passed(i)) {
        cumIn += st.input_tokens ?? 0;
        cumOut += st.output_tokens ?? 0;
        cumCost += st.cost_usd ?? 0;
      }
      if (i > p.idx) return;
      cards.push(stepCard(st, ts.number + '-' + st.seq, i === p.idx, i === p.idx && p.phase === 'anim', passed(i)));
    });
    if (ts.end <= p.idx) {
      const run = ts.turn.run;
      cards.push({
        key: ts.number + '-final',
        kind: 'final',
        title: '턴 ' + ts.number + ' 응답 전송',
        mono: false,
        current: ts.end === p.idx,
        anim: ts.end === p.idx && p.phase === 'anim',
        stamp: passed(ts.end) ? fmtSec(run.duration_ms) + ' · ' + fmtCost(run.cost_usd) : undefined,
      });
    }
  }
  const beats = s.turns.flatMap((ts) => [
    { title: '턴 ' + ts.number + ' · 사용자 입력', color: 'var(--color-ink)' },
    ...ts.steps.map((st) => {
      const b = stepBeat(st);
      return { title: '턴 ' + ts.number + ' · ' + b.title, color: b.color };
    }),
    { title: '턴 ' + ts.number + ' · 응답 전송', color: 'var(--color-ink)' },
  ]);
  const final = finalTextOf(cur.turn);
  return {
    history: s.turns.slice(0, t).flatMap((ts) => historyOf(ts.turn)),
    userShown: p.idx >= cur.start,
    typing: p.idx > cur.start && p.idx < cur.end,
    finalShown: p.idx === cur.end,
    cards,
    markers: beats.map((b, i) => ({ title: i + 1 + '단계 · ' + b.title, color: b.color, current: i === p.idx, past: i <= p.idx })),
    pos: p.idx + 1 + ' / ' + beats.length,
    cumIn,
    cumOut,
    cumCost,
    ended: endedIn(p, conversationTimeline(s)),
    turnNumber: cur.number,
    userText: inputText(cur.turn.input),
    finalText: final.text,
    options: final.options,
  };
}
