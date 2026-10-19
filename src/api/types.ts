/*
 * 대시보드 조회 API 타입(손으로 옮긴 임시본).
 *
 * 서버의 app/tangle/src/tangle_ai/schemas/dashboard.py(와 chat·proposal·note·errors 스키마)를
 * 필드 이름 그대로 옮겼다. 서버가 준비되면 `bun run gen:api`로 만든 openapi-typescript 출력
 * (src/api/schema.d.ts)으로 이 파일을 교체한다. UUID·시각은 문자열로 받는다.
 */

export type Uuid = string;
/** ISO 8601, 시간대 포함(AwareDatetime). */
export type DateTime = string;

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

// ── 필터 ───────────────────────────────────────────────────────────────

export type RunSource = 'all' | 'test' | 'real';
export type RunPath = 'model' | 'accept_direct' | 'reject_direct';
export type RunStatus = 'normal' | 'tool_failed' | 'outcome_unknown' | 'error';
export type StepKind = 'model' | 'tool' | 'server';
export type ToolKind = 'query' | 'mutation';
export type ToolStatus = 'success' | 'applied' | 'unchanged' | 'failed' | 'unknown';
export type ServerDecision = 'accept_direct' | 'reject_direct' | 'mutation_blocked';

export interface RunFilters {
  source?: RunSource;
  path?: RunPath | null;
  status?: RunStatus | null;
}

export interface RunPage extends RunFilters {
  limit?: number;
  cursor?: string | null;
}

// ── 목록 ───────────────────────────────────────────────────────────────

export interface RunListItem {
  request_id: Uuid;
  test_case_id: string | null;
  path: RunPath;
  status: RunStatus;
  model: string | null;
  message_replaced: boolean;
  model_calls: number;
  tool_calls: number;
  input_tokens: number;
  cached_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cost_usd: number | null;
  started_at: DateTime;
  finished_at: DateTime;
  duration_ms: number;
  input_preview: string | null;
}

export interface RunSummaryStats {
  runs: number;
  test_runs: number;
  real_runs: number;
  attention_runs: number;
  avg_duration_ms: number | null;
  avg_model_calls: number | null;
  avg_tool_calls: number | null;
  avg_total_tokens: number | null;
  total_cost_usd: number | null;
  avg_cost_usd: number | null;
}

export interface RunListResponse {
  summary: RunSummaryStats;
  items: RunListItem[];
  next_cursor: string | null;
}

// ── 상세 ───────────────────────────────────────────────────────────────

export interface AgentStep {
  seq: number;
  kind: StepKind;
  started_at: DateTime;
  duration_ms: number;
  input_tokens?: number | null;
  cached_tokens?: number | null;
  output_tokens?: number | null;
  reasoning_tokens?: number | null;
  cost_usd?: number | null;
  reasoning_summary?: string | null;
  /** 도구 이름 또는 final_answer */
  next_action?: string | null;
  tool_name?: string | null;
  tool_kind?: ToolKind | null;
  /** tool 단계의 결과 상태(ToolStatus). 서버 스키마는 str이다. */
  status?: string | null;
  arguments?: JsonObject | null;
  result?: JsonObject | null;
  error_code?: string | null;
  decision?: ServerDecision | null;
  note?: string | null;
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface MessageInput {
  type: 'message';
  text: string;
}

export interface ProposalAcceptInput {
  type: 'proposal_accept';
  proposal_id: Uuid;
}

export interface ProposalRejectInput {
  type: 'proposal_reject';
  proposal_id: Uuid;
}

export type ChatInput = MessageInput | ProposalAcceptInput | ProposalRejectInput;

export type ErrorCode =
  | 'invalid_request'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'confirmation_required'
  | 'unsupported_operation'
  | 'dependency_unavailable'
  | 'execution_timeout'
  | 'internal_error'
  | 'outcome_unknown';

export interface ErrorDetail {
  code: ErrorCode;
  message: string;
  retryable?: boolean;
}

export interface ErrorResponse {
  turn_id?: Uuid | null;
  error: ErrorDetail;
}

// 노트(목표·과제)

export type GoalStatus = 'in_progress' | 'completed';
export type ChallengeStatus = 'incomplete' | 'completed' | 'deleted';
export type ChallengeCategory = 'start' | 'sustain' | 'finish';
export type Actor = 'agent' | 'user';

export interface GoalSummary {
  id: Uuid;
  title: string;
  status: GoalStatus;
  current_deadline?: DateTime | null;
  completed_at?: DateTime | null;
  deleted_at?: DateTime | null;
}

export interface Goal extends GoalSummary {
  user_id: Uuid;
  description?: string | null;
  completion_criteria?: string | null;
  initial_title: string;
  initial_description?: string | null;
  initial_completion_criteria?: string | null;
  started_at: DateTime;
  initial_deadline?: DateTime | null;
  reminder_minutes_before?: number | null;
  adjustment_count?: number;
  context?: string | null;
}

export interface Challenge {
  id: Uuid;
  goal_id: Uuid;
  title: string;
  completion_criteria?: string | null;
  category: ChallengeCategory;
  sort_order: number;
  origin: Actor;
  status: ChallengeStatus;
  created_at: DateTime;
  completed_at?: DateTime | null;
  split_from_challenge_id?: Uuid | null;
  deleted_at?: DateTime | null;
}

export interface GoalDetail {
  goal: Goal;
  challenges: Challenge[];
}

export interface ChangeHistory {
  id: Uuid;
  goal_id: Uuid;
  challenge_id?: Uuid | null;
  proposal_id?: Uuid | null;
  actor: Actor;
  change_type: 'created' | 'updated' | 'scope_reduced' | 'deadline_changed' | 'split' | 'deleted' | 'completed' | 'reopened';
  before_data?: JsonObject | null;
  after_data?: JsonObject | null;
  reason?: string | null;
  context_evidence?: JsonObject | null;
  changed_at: DateTime;
}

// 제안서

export type ProposalType = 'initial_roadmap' | 'adjustment';

export interface ChallengeDraft {
  title: string;
  completion_criteria?: string | null;
  category: ChallengeCategory;
  sort_order: number;
}

export interface NewChallenge {
  temp_key: string;
  values: ChallengeDraft;
}

export type ProposalChange =
  | { action: 'update_goal'; values: JsonObject }
  | { action: 'delete_goal' }
  | ({ action: 'create_challenge' } & NewChallenge)
  | { action: 'update_challenge'; challenge_id: Uuid; values: JsonObject }
  | { action: 'delete_challenge'; challenge_id: Uuid }
  | { action: 'split_challenge'; challenge_id: Uuid; replacements: NewChallenge[] };

export type ChallengeReference = { type: 'existing'; challenge_id: Uuid } | { type: 'new'; temp_key: string };

export interface GoalPreview {
  title: string;
  description?: string | null;
  completion_criteria?: string | null;
  current_deadline?: DateTime | null;
  context?: string | null;
  is_deleted?: boolean;
}

export interface ChallengePreview extends ChallengeDraft {
  reference: ChallengeReference;
  status?: 'incomplete' | 'completed';
}

export interface ProposalPreview {
  goal: GoalPreview;
  roadmap: ChallengePreview[];
}

export interface Proposal {
  id: Uuid;
  goal_id: Uuid;
  type: ProposalType;
  reason: string;
  changes: ProposalChange[];
  result_preview?: ProposalPreview | null;
  created_at: DateTime;
  is_applied?: boolean;
}

// 응답 화면과 실행 결과

export interface GoalListView {
  type: 'goal_list';
  goals: GoalSummary[];
  next_cursor?: string | null;
}

export interface GoalDetailView {
  type: 'goal_detail';
  data: GoalDetail;
  recommended_challenge_id?: Uuid | null;
}

export interface ProposalView {
  type: 'proposal';
  data: Proposal;
}

export interface ChangeHistoryView {
  type: 'change_history';
  goal_id: Uuid;
  entries: ChangeHistory[];
  next_cursor?: string | null;
}

export type ChatView = GoalListView | GoalDetailView | ProposalView | ChangeHistoryView;

export type MutationAction =
  | 'create_goal'
  | 'update_goal_details'
  | 'create_proposal'
  | 'apply_proposal'
  | 'set_completion'
  | 'set_goal_reminder'
  | 'clear_goal_reminder';

export interface OperationResult {
  action: MutationAction;
  target_type: 'goal' | 'challenge' | 'proposal';
  target_id?: Uuid | null;
  status: 'applied' | 'unchanged' | 'failed' | 'unknown';
  error?: ErrorDetail | null;
}

export interface ChatResponse {
  turn_id: Uuid;
  message: string;
  options?: string[];
  views?: ChatView[];
  operations?: OperationResult[];
}

export interface RunDetailResponse {
  run: RunListItem;
  input: ChatInput;
  history: HistoryMessage[];
  response: ChatResponse | ErrorResponse | null;
  steps: AgentStep[];
}

// ── 케이스·집계 ─────────────────────────────────────────────────────────

export interface CaseStat {
  test_case_id: string;
  runs: number;
  normal: number;
  tool_failed: number;
  outcome_unknown: number;
  error: number;
  avg_duration_ms: number | null;
  avg_tool_calls: number | null;
  avg_total_tokens: number | null;
  avg_cost_usd: number | null;
  last_started_at: DateTime;
}

export interface CaseDetailResponse {
  stats: CaseStat;
  runs: RunListItem[];
}

export interface ToolStat {
  tool_name: string;
  tool_kind: ToolKind;
  calls: number;
  failed: number;
  unknown: number;
  avg_duration_ms: number | null;
}

export interface ShareStat {
  value: string;
  count: number;
  ratio: number;
}

export interface StatsResponse {
  tools: ToolStat[];
  tool_kinds: ShareStat[];
  token_samples: number[];
  paths: ShareStat[];
  statuses: ShareStat[];
  cases: CaseStat[];
}

export function isErrorResponse(r: ChatResponse | ErrorResponse | null): r is ErrorResponse {
  return r !== null && 'error' in r;
}
