import { isErrorResponse, type HistoryMessage, type RunDetailResponse, type ToolKind } from '../../api/types';
import { fmtCost, fmtInt, fmtSec } from '../../lib/format';
import { KIND, MODEL_COLOR, nextActionLabel } from '../../lib/kinds';
import { isFailure, stepTone, type Tone } from '../../lib/status';
import { displaySteps, errorMessageOf, type DisplayStep } from '../run-detail/displaySteps';

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

/** 재생 중일 때 다음으로 바뀔 상태와 그때까지의 시간. 멈춰 있으면 null. */
export function nextTick(st: ReplayState, s: ReplayScript): { delay: number; next: ReplayState } | null {
  if (!st.playing) return null;
  const H = s.history.length;
  const isHist = st.idx < H;
  if (st.phase === 'anim') return { delay: isHist ? RP_HIST_ANIM : RP_ANIM, next: { ...st, phase: 'done' } };
  if (st.idx < lastIndex(s)) {
    const hold = !isHist ? RP_HOLD : s.history[st.idx]!.role === 'assistant' ? RP_REPLY_HOLD : RP_HIST_HOLD;
    return { delay: hold, next: { ...st, idx: st.idx + 1, phase: 'anim' } };
  }
  return { delay: 0, next: { ...st, playing: false } };
}

export function isEnded(st: ReplayState, s: ReplayScript): boolean {
  return st.idx === lastIndex(s) && st.phase === 'done' && !st.playing;
}

export function toggle(st: ReplayState, s: ReplayScript): ReplayState {
  if (st.playing) return { ...st, playing: false };
  if (isEnded(st, s)) return START;
  return { ...st, playing: true };
}

export function seek(idx: number, s: ReplayScript): ReplayState {
  return { idx: Math.max(0, Math.min(lastIndex(s), idx)), phase: 'done', playing: false };
}

/** 전체 재생 시간(밀리초). 화면 문구용은 아니고 테스트와 검산에 쓴다. */
export function totalDuration(s: ReplayScript): number {
  let st: ReplayState | null = START;
  let t = 0;
  for (let guard = 0; st && guard < 10000; guard++) {
    const tick: { delay: number; next: ReplayState } | null = nextTick(st, s);
    if (!tick) break;
    t += tick.delay;
    st = tick.next;
  }
  return t;
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

export function finalTextOf(detail: RunDetailResponse): { text: string; options: string[] } {
  const r = detail.response;
  if (!r) return { text: '(저장된 응답 없음)', options: [] };
  if (isErrorResponse(r)) return { text: r.error.message, options: [] };
  return { text: r.message, options: r.options ?? [] };
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
    const anim = i === p.idx && p.phase === 'anim';
    const done = passed(i);
    const base = { key: String(st.seq), current: i === p.idx, anim, mono: false };
    if (st.kind === 'model') {
      cards.push({
        ...base,
        kind: 'model',
        title: '모델 호출 #' + st.modelIndex,
        text: st.reasoning_summary ?? '추론 요약을 받지 못했어요.',
        stamp: done ? fmtSec(st.duration_ms) + ' · 토큰 +' + fmtInt((st.input_tokens ?? 0) + (st.output_tokens ?? 0)) : undefined,
        next: done ? nextActionLabel(st.next_action) || undefined : undefined,
      });
    } else if (st.kind === 'tool') {
      const kind = st.tool_kind ?? 'query';
      cards.push({
        ...base,
        kind,
        title: st.tool_name ?? '-',
        mono: true,
        args: JSON.stringify(st.arguments ?? {}),
        bar: anim ? KIND[kind].color : undefined,
        stamp: done ? fmtSec(st.duration_ms) : undefined,
        badge: done ? stepTone(st.status) : undefined,
        error: done && st.error_code ? { code: st.error_code, message: errorMessageOf(st) } : undefined,
      });
    } else {
      cards.push({ ...base, kind: 'server', title: '서버 판단', text: st.note ?? '', textSmall: true });
    }
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
    ...s.steps.map((st) => ({
      title: st.kind === 'model' ? '모델 호출' : st.kind === 'tool' ? st.tool_name ?? '도구' : '서버 판단',
      color: st.kind === 'model' ? MODEL_COLOR : st.kind === 'tool' ? (isFailure(st.status) ? 'var(--data-failure)' : KIND[st.tool_kind ?? 'query'].color) : 'var(--color-dot-neutral)',
    })),
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
