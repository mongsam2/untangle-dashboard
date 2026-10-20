import { isErrorResponse, type HistoryMessage, type RunDetailResponse, type ToolKind } from '../../api/types';
import { fmtCost, fmtInt, fmtSec } from '../../lib/format';
import { KIND, MODEL_COLOR, nextActionLabel } from '../../lib/kinds';
import { isFailure, stepTone, type Tone } from '../../lib/status';
import { displaySteps, errorMessageOf, summaryText, type DisplayStep } from '../run-detail/displaySteps';

// 단계마다 짧은 애니메이션(ANIM) 뒤 걸린 시간을 찍고 잠깐(HOLD) 멈춘 다음 넘어간다.
export const RP_ANIM = 1800;
export const RP_HOLD = 1000;
// 이전 대화는 이번 요청보다 짧은 박자로 지나간다.
export const RP_HIST_ANIM = 1100;
export const RP_HIST_HOLD = 500;
// 탱글 답변 뒤 사용자가 읽고 다시 말하는 텀.
export const RP_REPLY_HOLD = 1400;

export interface ReplayState {
  idx: number;
  phase: 'anim' | 'done';
  playing: boolean;
}

/** 박자 순서: 이전 대화들 → 사용자 입력 → 단계들 → 응답 전송. */
export interface ReplayScript {
  history: HistoryMessage[];
  steps: DisplayStep[];
}

export function scriptOf(detail: RunDetailResponse): ReplayScript {
  return { history: detail.history, steps: displaySteps(detail.run, detail.steps) };
}

/** 마지막 박자(응답 전송)의 번호. 박자 수는 이 값 + 1이다. */
export function lastIndex(s: ReplayScript): number {
  return s.history.length + s.steps.length + 1;
}

export const START: ReplayState = { idx: 0, phase: 'anim', playing: true };

/** 박자 진행 규칙. 요청 재생과 대화 재생이 같은 타이머를 쓴다. */
export interface Timeline {
  /** 마지막 박자의 번호 */
  last: number;
  /** 박자의 애니메이션 시간과, 끝난 뒤 다음 박자까지 멈추는 시간 */
  delays(idx: number): { anim: number; hold: number };
}

export function runTimeline(s: ReplayScript): Timeline {
  const H = s.history.length;
  return {
    last: lastIndex(s),
    delays: (idx) => {
      if (idx >= H) return { anim: RP_ANIM, hold: RP_HOLD };
      return { anim: RP_HIST_ANIM, hold: s.history[idx]!.role === 'assistant' ? RP_REPLY_HOLD : RP_HIST_HOLD };
    },
  };
}

/** 재생 중일 때 다음으로 바뀔 상태와 그때까지의 시간. 멈춰 있으면 null. */
export function advance(st: ReplayState, t: Timeline): { delay: number; next: ReplayState } | null {
  if (!st.playing) return null;
  const d = t.delays(st.idx);
  if (st.phase === 'anim') return { delay: d.anim, next: { ...st, phase: 'done' } };
  if (st.idx < t.last) return { delay: d.hold, next: { ...st, idx: st.idx + 1, phase: 'anim' } };
  return { delay: 0, next: { ...st, playing: false } };
}

export function endedIn(st: ReplayState, t: Timeline): boolean {
  return st.idx === t.last && st.phase === 'done' && !st.playing;
}

export function toggleIn(st: ReplayState, t: Timeline): ReplayState {
  if (st.playing) return { ...st, playing: false };
  if (endedIn(st, t)) return START;
  return { ...st, playing: true };
}

export function seekIn(idx: number, t: Timeline): ReplayState {
  return { idx: Math.max(0, Math.min(t.last, idx)), phase: 'done', playing: false };
}

/** 전체 재생 시간(밀리초). 화면 문구용은 아니고 테스트와 검산에 쓴다. */
export function durationOf(t: Timeline): number {
  let st: ReplayState | null = START;
  let total = 0;
  for (let guard = 0; st && guard < 100000; guard++) {
    const tick: { delay: number; next: ReplayState } | null = advance(st, t);
    if (!tick) break;
    total += tick.delay;
    st = tick.next;
  }
  return total;
}

export function nextTick(st: ReplayState, s: ReplayScript): { delay: number; next: ReplayState } | null {
  return advance(st, runTimeline(s));
}

export function isEnded(st: ReplayState, s: ReplayScript): boolean {
  return endedIn(st, runTimeline(s));
}

export function toggle(st: ReplayState, s: ReplayScript): ReplayState {
  return toggleIn(st, runTimeline(s));
}

export function seek(idx: number, s: ReplayScript): ReplayState {
  return seekIn(idx, runTimeline(s));
}

export function totalDuration(s: ReplayScript): number {
  return durationOf(runTimeline(s));
}

// ── 화면 모델 ──────────────────────────────────────────────────────────

export type CardKind = 'model' | ToolKind | 'server' | 'final';

export interface ReplayCard {
  key: string;
  kind: CardKind;
  title: string;
  mono: boolean;
  current: boolean;
  anim: boolean;
  text?: string;
  textSmall?: boolean;
  args?: string;
  bar?: string;
  stamp?: string;
  badge?: Tone;
  error?: { code: string; message: string };
  next?: string;
}

export interface Marker {
  title: string;
  color: string;
  current: boolean;
  past: boolean;
}

export interface ReplayView {
  history: HistoryMessage[];
  userShown: boolean;
  typing: boolean;
  finalShown: boolean;
  cards: ReplayCard[];
  markers: Marker[];
  pos: string;
  cumIn: number;
  cumOut: number;
  cumCost: number;
  ended: boolean;
}

export function finalTextOf(detail: Pick<RunDetailResponse, 'response'>): { text: string; options: string[] } {
  const r = detail.response;
  if (!r) return { text: '(저장된 응답 없음)', options: [] };
  if (isErrorResponse(r)) return { text: r.error.message, options: [] };
  return { text: r.message, options: r.options ?? [] };
}

/** 단계 하나의 카드. 박자가 끝나야 걸린 시간·결과가 찍힌다. */
export function stepCard(st: DisplayStep, key: string, current: boolean, anim: boolean, done: boolean): ReplayCard {
  const base = { key, current, anim, mono: false };
  if (st.kind === 'model') {
    return {
      ...base,
      kind: 'model',
      title: '모델 호출 #' + st.modelIndex,
      text: summaryText(st),
      stamp: done ? fmtSec(st.duration_ms) + ' · 토큰 +' + fmtInt((st.input_tokens ?? 0) + (st.output_tokens ?? 0)) : undefined,
      next: done ? nextActionLabel(st.next_action) || undefined : undefined,
    };
  }
  if (st.kind === 'tool') {
    const kind = st.tool_kind ?? 'query';
    return {
      ...base,
      kind,
      title: st.tool_name ?? '-',
      mono: true,
      args: JSON.stringify(st.arguments ?? {}),
      bar: anim ? KIND[kind].color : undefined,
      stamp: done ? fmtSec(st.duration_ms) : undefined,
      badge: done ? stepTone(st.status) : undefined,
      error: done && st.error_code ? { code: st.error_code, message: errorMessageOf(st) } : undefined,
    };
  }
  return { ...base, kind: 'server', title: '서버 판단', text: st.note ?? '', textSmall: true };
}

/** 진행 막대에 찍을 단계 박자의 이름과 색. */
export function stepBeat(st: DisplayStep): { title: string; color: string } {
  return {
    title: st.kind === 'model' ? '모델 호출' : st.kind === 'tool' ? st.tool_name ?? '도구' : '서버 판단',
    color: st.kind === 'model' ? MODEL_COLOR : st.kind === 'tool' ? (isFailure(st.status) ? 'var(--data-failure)' : KIND[st.tool_kind ?? 'query'].color) : 'var(--color-dot-neutral)',
  };
}

export function buildView(detail: RunDetailResponse, s: ReplayScript, p: ReplayState): ReplayView {
  const H = s.history.length;
  const last = lastIndex(s);
  const passed = (i: number) => i < p.idx || (i === p.idx && p.phase === 'done');
  const cards: ReplayCard[] = [];
  let cumIn = 0;
  let cumOut = 0;
  let cumCost = 0;
  s.steps.forEach((st, j) => {
    const i = H + 1 + j;
    if (st.kind === 'model' && passed(i)) {
      cumIn += st.input_tokens ?? 0;
      cumOut += st.output_tokens ?? 0;
      cumCost += st.cost_usd ?? 0;
    }
    if (i > p.idx) return;
    cards.push(stepCard(st, String(st.seq), i === p.idx, i === p.idx && p.phase === 'anim', passed(i)));
  });
  if (p.idx === last) {
    const done = p.phase === 'done';
    cards.push({
      key: 'final',
      kind: 'final',
      title: '응답 전송',
      mono: false,
      current: true,
      anim: !done,
      stamp: done ? '총 ' + fmtSec(detail.run.duration_ms) + ' · ' + fmtCost(detail.run.cost_usd) : undefined,
    });
  }
  const beats: { title: string; color: string }[] = [
    ...s.history.map((h, k) => ({ title: '이전 대화 ' + (k + 1) + ' · ' + (h.role === 'user' ? '사용자' : '탱글'), color: 'var(--color-marker-past)' })),
    { title: '사용자 입력', color: 'var(--color-ink)' },
    ...s.steps.map(stepBeat),
    { title: '응답 전송', color: 'var(--color-ink)' },
  ];
  return {
    // 이전 대화: 사용자 말은 박자 시작에, 탱글 말은 입력 중 표시가 끝난 뒤에 나타난다.
    history: s.history.filter((h, k) => (h.role === 'user' ? k <= p.idx : passed(k))),
    userShown: p.idx >= H,
    typing: (p.idx < H && s.history[p.idx]!.role === 'assistant' && p.phase === 'anim') || (p.idx > H && p.idx < last),
    finalShown: p.idx === last,
    cards,
    markers: beats.map((b, i) => ({ title: i + 1 + '단계 · ' + b.title, color: b.color, current: i === p.idx, past: i <= p.idx })),
    pos: p.idx + 1 + ' / ' + beats.length,
    cumIn,
    cumOut,
    cumCost,
    ended: isEnded(p, s),
  };
}
