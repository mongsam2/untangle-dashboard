import type { SessionDetailResponse } from '../../api/types';
import type { DisplayStep } from '../run-detail/displaySteps';
import { buildTimeline, viewAt, type ChatLine, type ReplayView, type Timeline } from './replayModel';

/*
 * 대화 재생. 턴을 오래된 순으로 이어 붙이고, 턴 사이에는 짧은 쉼을 둔다.
 * 앞 턴의 채팅·단계·누적 토큰은 지우지 않고 계속 쌓인다.
 */

export const TURN_GAP_MS = 1500;

export interface SessionTimeline {
  turns: { offset: number; timeline: Timeline }[];
  total: number;
}

export function buildSessionTimeline(detail: SessionDetailResponse): SessionTimeline {
  let offset = 0;
  const turns = detail.turns.map((turn) => {
    const timeline = buildTimeline(turn);
    const entry = { offset, timeline };
    offset += timeline.total + TURN_GAP_MS;
    return entry;
  });
  return { turns, total: Math.max(0, offset - TURN_GAP_MS) };
}

export interface SessionReplayView extends ReplayView {
  /** 지금 재생 중인 턴 번호(1부터). 다 끝났으면 마지막 턴. */
  turnIndex: number;
  turnCount: number;
  /** 각 턴의 단계 묶음. 단계 흐름에서 턴 경계를 표시한다. */
  turnSteps: { turnIndex: number; steps: DisplayStep[] }[];
}

export function sessionViewAt(detail: SessionDetailResponse, tl: SessionTimeline, pos: number): SessionReplayView {
  const chat: ChatLine[] = [];
  const turnSteps: SessionReplayView['turnSteps'] = [];
  let cumIn = 0;
  let cumOut = 0;
  let cumCost = 0;
  let typing = false;
  let turnIndex = 0;
  const markers: ReplayView['markers'] = [];
  tl.turns.forEach((t, i) => {
    const turn = detail.turns[i]!;
    for (const m of t.timeline.beats) if (m.kind !== 'user') markers.push(m.kind === 'step' ? { t: t.offset + m.t, kind: m.kind, step: m.step } : { t: t.offset + m.t, kind: m.kind });
    if (pos < t.offset) return;
    turnIndex = i + 1;
    if (detail.omitted_turns > 0 && i === 0) chat.push({ kind: 'system', id: 'omitted', text: `앞의 ${detail.omitted_turns}턴은 생략했어요.` });
    const v = viewAt(turn, t.timeline, pos - t.offset, turn.run.turn_id);
    chat.push(...v.chat);
    turnSteps.push({ turnIndex: i + 1, steps: v.steps });
    cumIn += v.cumIn;
    cumOut += v.cumOut;
    cumCost += v.cumCost;
    typing = v.typing;
  });
  return {
    chat,
    typing,
    steps: turnSteps.flatMap((t) => t.steps),
    markers,
    pos,
    cumIn,
    cumOut,
    cumCost,
    ended: pos >= tl.total,
    turnIndex: Math.max(1, turnIndex),
    turnCount: detail.turns.length,
    turnSteps,
  };
}
