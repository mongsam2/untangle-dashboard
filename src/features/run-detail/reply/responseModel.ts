import type { ChatResponse, ErrorDetail, ErrorResponse, MutationOutcome, MutationResult, NoteState } from '../../../api/types';
import { isErrorResponse } from '../../../api/types';
import { MUTATION_OUTCOME_ORDER } from '../../../lib/status';

/** 대화 응답. 오류 응답이거나 응답이 없으면 null. */
export function chatOf(res: ChatResponse | ErrorResponse | null): ChatResponse | null {
  return res && !isErrorResponse(res) ? res : null;
}

/**
 * 응답의 오류. `ErrorResponse`뿐 아니라 답변은 실패했지만 확인된 실행 결과가 있어서 `ChatResponse`로 나간 응답도
 * `error`를 담는다. 후자는 `message`가 오류 문구와 같고 `operations`·`mutation_results`에 확인된 결과가 남아 있다.
 */
export function errorOf(res: ChatResponse | ErrorResponse | null): ErrorDetail | null {
  return res?.error ?? null;
}

export interface OutcomeCount {
  status: MutationOutcome;
  count: number;
}

/** 처리 결과별 건수. 0건인 결과는 빼고 고정 순서(반영 → 거절)로 돌려준다. */
export function outcomeCounts(results: MutationResult[]): OutcomeCount[] {
  const counts = new Map<MutationOutcome, number>();
  for (const r of results) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  return MUTATION_OUTCOME_ORDER.flatMap((status) => {
    const count = counts.get(status) ?? 0;
    return count > 0 ? [{ status, count }] : [];
  });
}

export interface RejectedChange {
  mutationId: string;
  code: string;
  message: string;
}

/** 거절된 변경과 반영하지 않은 이유. `error`는 거절일 때만 있지만 빠져 있어도 줄은 남긴다. */
export function rejectedOf(results: MutationResult[]): RejectedChange[] {
  return results
    .filter((r) => r.status === 'rejected')
    .map((r) => ({ mutationId: r.mutation_id, code: r.error?.code ?? '-', message: r.error?.message ?? '이유가 기록되지 않았어요.' }));
}

export interface NoteStateRow {
  goalId: string;
  title: string;
  revision: number;
  /** 삭제 표식이 붙은 과제는 세지 않은 과제 수. */
  challenges: number;
  deletedChallenges: number;
  goalDeleted: boolean;
}

/** 목표 제목과 목표 버전. 삭제 표식이 붙은 목표·과제도 목록에 남아 있어서 따로 센다. */
export function noteStateRows(states: NoteState[]): NoteStateRow[] {
  return states.map((n) => {
    const challenges = n.challenges ?? [];
    const deleted = challenges.filter((c) => c.status === 'deleted' || !!c.deleted_at).length;
    return {
      goalId: n.goal.id,
      title: n.goal.title,
      revision: n.revision,
      challenges: challenges.length - deleted,
      deletedChallenges: deleted,
      goalDeleted: !!n.goal.deleted_at,
    };
  });
}
