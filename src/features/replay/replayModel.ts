import { isErrorResponse, type AgentStep, type Proposal, type Question, type RunDetailResponse, type StoredResponse, type TodayBriefingCard } from '../../api/types';
import { inputText } from '../../lib/input';
import { hasFallbackAnswer } from '../../lib/response';
import { RUN_STATUS_HINT } from '../../lib/status';
import { displaySteps, type DisplayStep } from '../run-detail/displaySteps';

/*
 * 재생 모델. 실행 하나를 시간 축 위의 박자(beat)로 펼치고, 재생 위치에서 보이는 화면을 계산한다.
 * 박자는 사용자 입력(0ms) → 단계들(기록된 시작 시각) → 최종 응답(총 소요시간) 순서다.
 * 단계의 started_at은 실행 started_at 기준 상대 시각으로 바꾸고, 기록이 비어 있으면 소요시간을 이어 붙인다.
 */

export type ChatLine =
  | { kind: 'user'; id: string; text: string }
  | { kind: 'agent'; id: string; text: string; fallback?: boolean }
  | { kind: 'proposal'; id: string; proposal: Proposal }
  | { kind: 'question'; id: string; questions: Question[] }
  | { kind: 'briefing'; id: string; card: TodayBriefingCard }
  | { kind: 'error'; id: string; code: string; text: string }
  | { kind: 'system'; id: string; text: string };

export type Beat = { t: number; kind: 'user' } | { t: number; kind: 'step'; step: DisplayStep } | { t: number; kind: 'final' };

export interface Timeline {
  beats: Beat[];
  /** 마지막 박자의 시각. 끝나지 않은 실행은 마지막 단계 끝. */
  total: number;
  finished: boolean;
}

const MIN_GAP_MS = 20;

function relativeStart(run: RunDetailResponse['run'], step: AgentStep): number | null {
  const t0 = Date.parse(run.started_at);
  const t = Date.parse(step.started_at);
  if (Number.isNaN(t0) || Number.isNaN(t)) return null;
  const rel = t - t0;
  return rel < 0 ? null : rel;
}

export function buildTimeline(detail: RunDetailResponse): Timeline {
  const steps = displaySteps(detail.run, detail.steps);
  const beats: Beat[] = [{ t: 0, kind: 'user' }];
  // 첫 단계는 입력 직후에 온다. 기록 시각이 입력과 같아도 입력이 먼저 보이게 한 박자 띄운다.
  let cursor = MIN_GAP_MS;
  for (const step of steps) {
    const rel = relativeStart(detail.run, step);
    const t = Math.max(rel ?? cursor, cursor);
    beats.push({ t, kind: 'step', step });
    cursor = t + Math.max(step.duration_ms, 0) + MIN_GAP_MS;
  }
  const finished = detail.response !== null;
  const total = finished ? Math.max(detail.run.duration_ms ?? cursor, cursor) : cursor;
  if (finished) beats.push({ t: total, kind: 'final' });
  return { beats, total, finished };
}

/** 최종 응답을 채팅 줄로 바꾼다. 앱 화면 순서(답변 → 질문·제안 → 정보 카드)를 따른다. */
export function responseLines(response: StoredResponse | null, status: RunDetailResponse['run']['status'], prefix: string): ChatLine[] {
  if (!response) return [{ kind: 'system', id: prefix + ':pending', text: '아직 끝나지 않은 요청이에요.' }];
  if (isErrorResponse(response)) return [{ kind: 'error', id: prefix + ':error', code: response.error.code, text: response.error.message }];
  const lines: ChatLine[] = [];
  if (response.answer) lines.push({ kind: 'agent', id: prefix + ':answer', text: response.answer.text, fallback: hasFallbackAnswer(response) });
  if (response.ask?.type === 'question' && response.ask.questions?.length) lines.push({ kind: 'question', id: prefix + ':q', questions: response.ask.questions });
  if (response.ask?.type === 'proposal' && response.ask.proposals) {
    for (const p of response.ask.proposals) lines.push({ kind: 'proposal', id: prefix + ':p:' + p.proposal_id, proposal: p });
  }
  response.information_cards.forEach((c, i) => lines.push({ kind: 'briefing', id: prefix + ':c' + i, card: c }));
  if (lines.length === 0) lines.push({ kind: 'system', id: prefix + ':empty', text: RUN_STATUS_HINT[status] });
  return lines;
}

export interface ReplayView {
  chat: ChatLine[];
  /** 모델이 아직 답을 만들고 있는 동안 ··· 말풍선을 보인다. */
  typing: boolean;
  /** 지금까지 드러난 단계. */
  steps: DisplayStep[];
  /** 진행 막대 위의 표식 시각(단계 시작·최종 응답). */
  markers: { t: number; kind: Beat['kind']; step?: DisplayStep }[];
  pos: number;
  cumIn: number;
  cumOut: number;
  cumCost: number;
  ended: boolean;
}

export function viewAt(detail: RunDetailResponse, timeline: Timeline, pos: number, prefix = detail.run.turn_id): ReplayView {
  const chat: ChatLine[] = [];
  const steps: DisplayStep[] = [];
  let cumIn = 0;
  let cumOut = 0;
  let cumCost = 0;
  let finalShown = false;
  for (const b of timeline.beats) {
    if (b.t > pos) break;
    if (b.kind === 'user') chat.push({ kind: 'user', id: prefix + ':user', text: inputText(detail.input) });
    else if (b.kind === 'step') {
      steps.push(b.step);
      if (b.step.kind === 'model') {
        cumIn += b.step.input_tokens ?? 0;
        cumOut += b.step.output_tokens ?? 0;
        cumCost += b.step.cost_usd ?? 0;
      }
    } else finalShown = true;
  }
  if (finalShown) chat.push(...responseLines(detail.response, detail.run.status, prefix));
  const ended = pos >= timeline.total;
  const typing = !finalShown && !(ended && !timeline.finished) && pos > 0;
  if (ended && !timeline.finished) chat.push({ kind: 'system', id: prefix + ':pending', text: '아직 끝나지 않은 요청이에요.' });
  return {
    chat,
    typing,
    steps,
    markers: timeline.beats.filter((b) => b.kind !== 'user').map((b) => (b.kind === 'step' ? { t: b.t, kind: b.kind, step: b.step } : { t: b.t, kind: b.kind })),
    pos,
    cumIn,
    cumOut,
    cumCost,
    ended,
  };
}

/** 재생 속도. 긴 실행도 몇 초 안에 볼 수 있게 배속을 둔다. */
export const SPEEDS = [1, 2, 4, 8] as const;
export type Speed = (typeof SPEEDS)[number];
