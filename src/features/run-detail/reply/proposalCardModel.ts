import type { ChallengeCategory, Proposal, RunDetailResponse } from '../../../api/types';
import { fmtDeadline, fmtWall, shortId } from '../../../lib/format';

export const CATEGORY_LABEL: Record<ChallengeCategory, string> = { start: '시작', sustain: '지속', finish: '완수' };

export interface ProposalItemModel {
  n: number;
  title: string;
  /** 시작·지속·완수. 사용자가 직접 만든 과제(origin=user)는 역할이 없어서 빈 문자열이다. */
  category: string;
  /** 예정 시작·예상 소요 시간·마감. 정해진 것이 없으면 빈 문자열이다. */
  schedule: string;
  done: boolean;
  mark: string;
}

export interface ProposalCardModel {
  id: string;
  typeLabel: string;
  applied: boolean;
  title: string;
  meta: string;
  reason: string;
  items: ProposalItemModel[];
  removed: { title: string; why: string }[];
}

const COUNT_WORD: Record<number, string> = { 2: '두', 3: '세', 4: '네', 5: '다섯' };

/**
 * 제안서 카드에 그릴 값. 빠지는 과제의 제목은 제안서에 없어서 titleOf로 찾고, 못 찾으면 '과제'와 짧은 ID를 보여준다.
 */
export function proposalCardOf(p: Proposal, titleOf: (id: string) => string | undefined = () => undefined): ProposalCardModel {
  const preview = p.result_preview;
  const splitKeys = new Set<string>();
  const removed: ProposalCardModel['removed'] = [];
  for (const c of p.changes) {
    if (c.action === 'split_challenge') {
      c.replacements.forEach((r) => splitKeys.add(r.temp_key));
      const n = c.replacements.length;
      removed.push({ title: titleOf(c.challenge_id) ?? '과제 ' + shortId(c.challenge_id), why: (COUNT_WORD[n] ?? n + '개') + ' 과제로 분할' });
    } else if (c.action === 'delete_challenge') {
      removed.push({ title: titleOf(c.challenge_id) ?? '과제 ' + shortId(c.challenge_id), why: '삭제' });
    }
  }
  const roadmap =
    preview?.roadmap ??
    p.changes.flatMap((c) =>
      c.action === 'create_challenge' ? [{ ...c.values, reference: { type: 'new' as const, temp_key: c.temp_key }, status: 'incomplete' as const }] : [],
    );
  const items = roadmap.map((it, i) => {
    const done = it.status === 'completed';
    const ref = it.reference;
    const isNew = ref.type === 'new';
    const mark = done ? '완료' : ref.type === 'new' && splitKeys.has(ref.temp_key) ? '분할로 추가' : isNew && p.type === 'adjustment' ? '추가' : '';
    const schedule = [
      fmtWall(it.start_date, it.start_time),
      it.estimated_minutes != null ? it.estimated_minutes + '분' : null,
      it.deadline ? '기한 ' + fmtDeadline(it.deadline) : null,
    ]
      .filter(Boolean)
      .join(' · ');
    return { n: i + 1, title: it.title, category: it.category ? (CATEGORY_LABEL[it.category] ?? it.category) : '', schedule, done, mark };
  });
  const goal = preview?.goal;
  const meta = [goal?.current_deadline ? '기한 ' + fmtDeadline(goal.current_deadline) : '기한 없음', goal?.completion_criteria ? '완료 기준: ' + goal.completion_criteria : null]
    .filter(Boolean)
    .join(' · ');
  return {
    id: p.id,
    typeLabel: p.type === 'initial_roadmap' ? '첫 로드맵 제안' : '조정 제안',
    applied: !!p.is_applied,
    title: goal?.title ?? '',
    meta,
    reason: p.reason,
    items,
    removed,
  };
}

function walk(v: unknown, out: Map<string, string>): void {
  if (Array.isArray(v)) v.forEach((x) => walk(x, out));
  else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.id === 'string' && typeof o.title === 'string' && !out.has(o.id)) out.set(o.id, o.title);
    Object.values(o).forEach((x) => walk(x, out));
  }
}

/** 이번 요청에서 본 과제·목표 ID → 제목. 응답 화면과 도구 결과를 뒤진다. */
export function collectTitles(detail: RunDetailResponse): Map<string, string> {
  const out = new Map<string, string>();
  const res = detail.response;
  if (res && 'views' in res) walk(res.views, out);
  for (const s of detail.steps) walk(s.result, out);
  return out;
}
