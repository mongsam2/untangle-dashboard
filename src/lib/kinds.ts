import type { GuardrailLayer, ServerDecision, StepKind, ToolKind } from '../api/types';

// 데이터 색은 tokens.css의 변수를 그대로 가리킨다.
export const KIND: Record<ToolKind, { label: string; color: string; bg: string }> = {
  query: { label: '조회', color: 'var(--data-query)', bg: 'var(--surface-emphasis)' },
  proposal: { label: '제안', color: 'var(--data-proposal)', bg: 'var(--surface-warning)' },
  briefing: { label: '브리핑', color: 'var(--data-briefing)', bg: 'var(--surface-success)' },
  memory: { label: '기억', color: 'var(--data-memory)', bg: 'var(--surface-memory)' },
};

export const TOOL_KIND_ORDER: ToolKind[] = ['query', 'proposal', 'briefing', 'memory'];

export const MODEL_COLOR = 'var(--data-model)';
export const SERVER_COLOR = 'var(--data-server)';
export const FAILURE_COLOR = 'var(--data-failure)';
export const GUARD_COLOR = 'var(--guard-stripe-light)';

// 입력 = 파랑(비용 비중이 커서 채색), 출력 = 그래파이트. 묶음 안에서는 진한 톤과 연한 톤으로만 나눈다.
export const TOK = {
  fresh: 'var(--tok-input-fresh)',
  cached: 'var(--tok-input-cached)',
  answer: 'var(--tok-output-answer)',
  reason: 'var(--tok-output-reasoning)',
} as const;

export type IconKind = 'model' | ToolKind | 'guardrail' | 'server' | 'final' | 'user';

export const ICON_BG: Record<IconKind, string> = {
  model: 'var(--surface-inverse)',
  query: 'var(--surface-emphasis)',
  proposal: 'var(--surface-warning)',
  briefing: 'var(--surface-success)',
  memory: 'var(--surface-memory)',
  guardrail: 'var(--guard-bg)',
  server: 'var(--surface-field)',
  final: 'var(--surface-success)',
  user: 'var(--surface-field)',
};

export function iconKindOf(kind: StepKind, toolKind?: ToolKind | null): IconKind {
  if (kind === 'tool') return toolKind ?? 'query';
  return kind;
}

/** 도구 14개. 설계 문서 `agent-tools.md`의 순서다. 호출 수가 같을 때의 정렬 기준으로도 쓴다. */
export const TOOLS: { name: string; kind: ToolKind; label: string }[] = [
  { name: 'search_items', kind: 'query', label: '할 일·계획 조회' },
  { name: 'get_items', kind: 'query', label: 'ID로 조회' },
  { name: 'propose_create_todo', kind: 'proposal', label: '할 일 생성 제안' },
  { name: 'propose_update_todo', kind: 'proposal', label: '할 일 변경 제안' },
  { name: 'propose_delete_todo', kind: 'proposal', label: '할 일 삭제 제안' },
  { name: 'propose_move_todo_to_plan', kind: 'proposal', label: '할 일 → 계획 이동 제안' },
  { name: 'propose_create_plan', kind: 'proposal', label: '계획 생성 제안' },
  { name: 'propose_update_plan', kind: 'proposal', label: '계획 변경 제안' },
  { name: 'propose_delete_plan', kind: 'proposal', label: '계획 삭제 제안' },
  { name: 'propose_move_plan_to_todo', kind: 'proposal', label: '계획 → 할 일 이동 제안' },
  { name: 'get_today_briefing', kind: 'briefing', label: '오늘 브리핑' },
  { name: 'read_memory', kind: 'memory', label: '기억 읽기' },
  { name: 'update_memory', kind: 'memory', label: '기억 고치기' },
  { name: 'rewrite_memory', kind: 'memory', label: '기억 다시 쓰기' },
];

/** 2026-10-30에 search_items로 합친 옛 조회 도구다. 그 전 기록의 이름 표시에만 쓴다. */
const LEGACY_TOOLS: typeof TOOLS = [
  { name: 'search_todos', kind: 'query', label: '할 일 조회' },
  { name: 'search_plans', kind: 'query', label: '계획 조회' },
];

export const TOOL_ORDER = [...TOOLS, ...LEGACY_TOOLS].map((t) => t.name);

function findTool(name: string) {
  return TOOLS.find((t) => t.name === name) ?? LEGACY_TOOLS.find((t) => t.name === name);
}

export function toolOrderIndex(name: string): number {
  const i = TOOL_ORDER.indexOf(name);
  return i < 0 ? TOOL_ORDER.length : i;
}

export function toolKindOf(name: string): ToolKind {
  return findTool(name)?.kind ?? 'query';
}

export function toolLabel(name: string): string {
  return findTool(name)?.label ?? name;
}

export const RAMP: Record<ToolKind, string[]> = {
  query: [1, 2, 3].map((i) => `var(--ramp-query-${i})`),
  proposal: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `var(--ramp-proposal-${i})`),
  briefing: ['var(--ramp-briefing-1)'],
  memory: ['var(--ramp-memory-1)', 'var(--ramp-memory-2)', 'var(--ramp-memory-3)'],
};

export function rampColor(kind: ToolKind, i: number): string {
  const r = RAMP[kind];
  return r[Math.min(i, r.length - 1)]!;
}

export function nextActionLabel(next: string | null | undefined): string {
  if (!next) return '';
  return next === 'final_response' ? '→ 최종 응답 작성' : '→ ' + next + ' 호출';
}

/** 가드레일 층. 설계 문서 `guardrails.md`의 층 번호를 따른다. */
export const GUARD_LAYER: Record<GuardrailLayer, { label: string; short: string }> = {
  input: { label: '입력 가드레일', short: '입력' },
  tool: { label: '도구 가드레일', short: '도구' },
  output: { label: '출력 가드레일', short: '출력' },
  limit: { label: '한도', short: '한도' },
};

export const GUARD_LAYER_ORDER: GuardrailLayer[] = ['input', 'tool', 'output', 'limit'];

export const SERVER_DECISION: Record<ServerDecision, string> = {
  correction_requested: '보정 요청',
  cards_assembled: '카드 조립',
  limit_exceeded: '한도 초과로 중단',
  output_rejected: '출력 거부',
  input_blocked: '입력 차단',
};
