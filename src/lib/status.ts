import type { CSSProperties } from 'react';
import type { MutationOutcome, RunPath, RunSource, RunStatus } from '../api/types';

export interface Tone {
  label: string;
  bg: string;
  fg: string;
  dot: string;
}

export const RUN_STATUS: Record<RunStatus, Tone> = {
  normal: { label: '정상', bg: 'var(--status-ok-bg)', fg: 'var(--status-ok-fg)', dot: 'var(--status-ok-dot)' },
  tool_failed: { label: '도구 실패', bg: 'var(--status-warn-bg)', fg: 'var(--status-warn-fg)', dot: 'var(--status-warn-dot)' },
  outcome_unknown: { label: '반영 미확인', bg: 'var(--status-unknown-bg)', fg: 'var(--status-unknown-fg)', dot: 'var(--status-unknown-dot)' },
  error: { label: '응답 오류', bg: 'var(--status-error-bg)', fg: 'var(--status-error-fg)', dot: 'var(--status-error-dot)' },
};

export const RUN_STATUS_ORDER: RunStatus[] = ['normal', 'tool_failed', 'outcome_unknown', 'error'];

const NEUTRAL_BG = 'var(--color-divider)';
const FAIL = { bg: 'var(--failure-bg)', fg: 'var(--failure-fg)', dot: 'var(--data-failure)' };

export const STEP_STATUS: Record<string, Tone> = {
  success: { label: '성공', bg: NEUTRAL_BG, fg: 'var(--color-ink)', dot: 'var(--color-dot-neutral)' },
  applied: { label: '반영', bg: NEUTRAL_BG, fg: 'var(--color-ink)', dot: 'var(--color-ink)' },
  unchanged: { label: '변경 없음', bg: NEUTRAL_BG, fg: 'var(--color-body)', dot: 'var(--color-dot-neutral)' },
  failed: { label: '실패', ...FAIL },
  unknown: { label: 'unknown', ...FAIL },
};

/** 사용자 변경(`mutation_results`)의 처리 결과. 거절만 실패색이고, 나머지는 서버가 의도한 정상 처리다. */
export const MUTATION_OUTCOME_ORDER: MutationOutcome[] = ['applied', 'unchanged', 'superseded', 'already_exists', 'target_deleted', 'rejected'];

export const MUTATION_OUTCOME: Record<MutationOutcome, Tone> = {
  applied: { label: '반영', bg: NEUTRAL_BG, fg: 'var(--color-ink)', dot: 'var(--color-ink)' },
  unchanged: { label: '변경 없음', bg: NEUTRAL_BG, fg: 'var(--color-body)', dot: 'var(--color-dot-neutral)' },
  superseded: { label: '더 나중 변경이 있음', bg: NEUTRAL_BG, fg: 'var(--color-body)', dot: 'var(--color-dot-neutral)' },
  already_exists: { label: '이미 있음', bg: NEUTRAL_BG, fg: 'var(--color-body)', dot: 'var(--color-dot-neutral)' },
  target_deleted: { label: '삭제된 대상', bg: 'var(--status-warn-bg)', fg: 'var(--status-warn-fg)', dot: 'var(--status-warn-dot)' },
  rejected: { label: '거절', ...FAIL },
};

export function stepTone(status: string | null | undefined): Tone {
  return STEP_STATUS[status ?? ''] ?? { label: status ?? '-', bg: NEUTRAL_BG, fg: 'var(--color-ink)', dot: 'var(--color-dot-neutral)' };
}

export function isFailure(status: string | null | undefined): boolean {
  return status === 'failed' || status === 'unknown';
}

// 표 행 배경. 정상은 색을 입히지 않고 문제가 있는 요청만 연하게 칠한다.
export const ROW_TINT: Record<RunStatus, string> = {
  normal: '',
  tool_failed: 'var(--row-tint-warn)',
  outcome_unknown: 'var(--row-tint-unknown)',
  error: 'var(--row-tint-error)',
};

export function rowStyleOf(status: RunStatus, selected: boolean): CSSProperties {
  const bg = ROW_TINT[status] || (selected ? 'var(--color-parchment)' : '');
  const style: CSSProperties = {};
  if (bg) style.background = bg;
  if (selected) style.boxShadow = 'inset 3px 0 0 var(--color-focus)';
  return style;
}

export const PATH_LABEL: Record<RunPath, string> = {
  model: '모델',
  accept_direct: '수락 직행',
  reject_direct: '거절 직행',
};

export const PATH_COLOR: Record<RunPath, string> = {
  model: 'var(--data-model)',
  accept_direct: 'var(--path-accept)',
  reject_direct: 'var(--path-reject)',
};

export type RowSource = Exclude<RunSource, 'all'>;

export const SOURCE: Record<RowSource, { label: string; bg: string; fg: string }> = {
  test: { label: '테스트', bg: 'var(--color-divider)', fg: 'var(--color-ink)' },
  real: { label: '실제 요청', bg: 'var(--color-ink)', fg: 'var(--color-canvas)' },
};

export function sourceOf(testCaseId: string | null): RowSource {
  return testCaseId ? 'test' : 'real';
}
