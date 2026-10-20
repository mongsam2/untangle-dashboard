import type { StepKind, ToolKind } from '../api/types';

// 데이터 색은 tokens.css의 변수를 그대로 가리킨다.
export const KIND: Record<ToolKind, { label: string; color: string; bg: string }> = {
  query: { label: '조회', color: 'var(--data-query)', bg: 'var(--icon-bg-query)' },
  mutation: { label: '변경', color: 'var(--data-mutation)', bg: 'var(--icon-bg-mutation)' },
};

export const MODEL_COLOR = 'var(--data-model)';
export const SERVER_COLOR = 'var(--data-server)';
export const FAILURE_COLOR = 'var(--data-failure)';

// 입력 = 인디고(비용 비중이 커서 채색), 출력 = 그래파이트. 묶음 안에서는 진한 톤과 연한 톤으로만 나눈다.
export const TOK = {
  fresh: 'var(--tok-input-fresh)',
  cached: 'var(--tok-input-cached)',
  answer: 'var(--tok-output-answer)',
  reason: 'var(--tok-output-reasoning)',
} as const;

export type IconKind = 'model' | ToolKind | 'server' | 'final';

export const ICON_BG: Record<IconKind, string> = {
  model: 'var(--icon-bg-model)',
  query: 'var(--icon-bg-query)',
  mutation: 'var(--icon-bg-mutation)',
  server: 'var(--color-canvas)',
  final: 'var(--color-parchment)',
};

export function iconKindOf(kind: StepKind, toolKind?: ToolKind | null): IconKind {
  if (kind === 'tool') return toolKind ?? 'query';
  return kind;
}

/**
 * 도구 표기 순서. 호출 수가 같을 때의 정렬 기준이다.
 * `set_goal_reminder`·`clear_goal_reminder`는 `set_schedule`·`set_reminder`로 바뀌었지만
 * 예전 실행 기록에는 남아 있어서 뒤에 둔다. 도구 종류(조회·변경)는 기록이 가진 `tool_kind`를 따른다.
 */
export const TOOL_ORDER = [
  'search_goals',
  'get_goal',
  'get_change_history',
  'get_proposals',
  'create_goal',
  'update_goal_details',
  'create_proposal',
  'apply_proposal',
  'set_completion',
  'set_schedule',
  'set_reminder',
  'set_goal_reminder',
  'clear_goal_reminder',
];

export function toolOrderIndex(name: string): number {
  const i = TOOL_ORDER.indexOf(name);
  return i < 0 ? TOOL_ORDER.length : i;
}

export const RAMP: Record<ToolKind, string[]> = {
  query: [1, 2, 3, 4, 5].map((i) => `var(--ramp-query-${i})`),
  mutation: [1, 2, 3, 4, 5, 6, 7].map((i) => `var(--ramp-mutation-${i})`),
};

export function rampColor(kind: ToolKind, i: number): string {
  const r = RAMP[kind];
  return r[Math.min(i, r.length - 1)]!;
}

export function nextActionLabel(next: string | null | undefined): string {
  if (!next) return '';
  return next === 'final_answer' ? '→ 최종 답변 작성' : '→ ' + next + ' 호출';
}
