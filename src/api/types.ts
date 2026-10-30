/*
 * 대시보드 조회 API(`/v2/dashboard/*`) 타입.
 *
 * 정본은 untangle-ai-v2의 `docs/tangle/server-contract.md` §6과 탱글 에이전트 재개발 스레드에서 합의한
 * 객체 모양이다. 새 탱글 서버가 OpenAPI 문서를 내면 이 파일을 `openapi-typescript` 생성물로 바꿔도 되지만,
 * 그때까지는 손으로 맞춘다. UUID·시각은 문자열로 받는다. 서버가 쓰지 않는 필드는 null이다.
 */

// ── 필터 ───────────────────────────────────────────────────────────────

export type RunSource = 'all' | 'test' | 'real';

/** 실행 상태 6종. 도구 오류 반환이 있으면 tool_failed, 입력 가드레일 차단은 blocked_input, 시간·왕복·출력 한도는 limit_exceeded,
 *  보정 뒤에도 출력 검증 실패면 output_rejected, 그 밖의 서버 오류는 error다. */
export type RunStatus = 'normal' | 'tool_failed' | 'blocked_input' | 'limit_exceeded' | 'output_rejected' | 'error';

export interface RunFilters {
  source?: RunSource;
  status?: RunStatus | null;
}

/** 목록 조회 조건에 페이지 크기(1~100, 기본 20)와 커서를 더한 것. */
export interface RunPage extends RunFilters {
  limit?: number;
  cursor?: string | null;
}

export interface SessionPage {
  source?: RunSource;
  limit?: number;
  cursor?: string | null;
}

// ── 실행 목록 ───────────────────────────────────────────────────────────

export type AskType = 'question' | 'proposal';

export interface RunListItem {
  turn_id: string;
  session_id: string;
  test_case_id: string | null;
  status: RunStatus;
  model: string | null;
  model_calls: number;
  tool_calls: number;
  /** 형식·업무 오류로 모델에게 다시 시킨 횟수(최대 1). */
  corrections: number;
  input_tokens: number;
  cached_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cost_usd: number | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  input_preview: string;
  ask_type: AskType | null;
  question_count: number;
  proposal_count: number;
}

export interface RunSummaryStats {
  runs: number;
  test_runs: number;
  real_runs: number;
  normal_runs: number;
  tool_failed_runs: number;
  blocked_input_runs: number;
  limit_exceeded_runs: number;
  output_rejected_runs: number;
  error_runs: number;
  /** 모델을 한 번이라도 부른 실행 수. 입력 차단은 모델을 부르지 않는다. */
  model_runs: number;
  total_model_calls: number;
  avg_model_calls: number | null;
  total_tool_calls: number;
  avg_tool_calls: number | null;
  total_corrections: number;
  total_tokens: number;
  avg_total_tokens: number | null;
  total_input_tokens: number;
  total_cached_tokens: number;
  total_output_tokens: number;
  total_reasoning_tokens: number;
  total_cost_usd: number | null;
  avg_cost_usd: number | null;
  avg_duration_ms: number | null;
  max_duration_ms: number | null;
}

export interface RunListResponse {
  summary: RunSummaryStats;
  items: RunListItem[];
  next_cursor: string | null;
}

// ── 요청 입력 ───────────────────────────────────────────────────────────

export type ItemCategory = 'todo' | 'plan';

export interface SelectedTarget {
  category: ItemCategory;
  id: string;
}

export interface RequestContext {
  requested_at: string;
  time_zone: string;
  selected_targets: SelectedTarget[];
}

/** 답변 본문은 저장하지 않으므로 `answers` 입력은 개수만 남는다. */
export interface RunInput {
  kind: 'text' | 'answers';
  text: string | null;
  answer_count: number | null;
  context: RequestContext;
}

// ── 응답 ───────────────────────────────────────────────────────────────

export interface Subtask {
  id: string | null;
  title: string;
  is_completed: boolean;
}

/** 카드·브리핑의 항목. 할 일은 date·time·reminder_minutes_before가 null이다. */
export interface Item {
  id: string | null;
  category: ItemCategory;
  title: string;
  is_completed: boolean;
  estimated_minutes: number | null;
  memo: string | null;
  date: string | null;
  time: string | null;
  reminder_minutes_before: number | null;
  subtasks: Subtask[];
}

export type ProposalType =
  | 'create_todo'
  | 'update_todo'
  | 'delete_todo'
  | 'move_todo_to_plan'
  | 'create_plan'
  | 'update_plan'
  | 'delete_plan'
  | 'move_plan_to_todo';

export type ChangeField = 'title' | 'estimated_minutes' | 'memo' | 'date' | 'time' | 'reminder_minutes_before';

export type Operation =
  | { op: 'create'; item: Item }
  | { op: 'move'; category: ItemCategory; date: string | null; time: string | null; reminder_minutes_before: number | null }
  | { op: 'update'; changes: { field: ChangeField; value: string | number | null }[] }
  | { op: 'set_subtasks'; subtasks: { subtask_id: string | null; title: string }[] }
  | { op: 'delete' };

export interface ProposalContent {
  before: Item | null;
  after: Item | null;
  operations: Operation[];
}

export interface Proposal {
  proposal_id: string;
  proposal_type: ProposalType;
  target_item_id: string | null;
  content: ProposalContent;
}

export interface QuestionOption {
  option_id: string;
  text: string;
  item_id: string | null;
}

export interface Question {
  question_id: string;
  text: string;
  options: QuestionOption[];
}

export interface Ask {
  type: AskType;
  /** 항상 null. 질문 이유·카드 안내 문장은 answer에 담긴다. 백엔드가 answer와 잇는 자리라 필드만 남아 있다. */
  text: string | null;
  questions: Question[] | null;
  proposals: Proposal[] | null;
}

export interface TodayBriefingCard {
  type: 'today_briefing';
  date: string;
  plans: Item[];
  todos: Item[];
  plan_count: number;
  todo_count: number;
}

export type InformationCard = TodayBriefingCard;

export interface ChatResponse {
  session_id: string;
  turn_id: string;
  response_id: string;
  answer: { text: string } | null;
  ask: Ask | null;
  information_cards: InformationCard[];
}

export interface ErrorResponse {
  turn_id: string | null;
  error: { code: string; message: string; retryable: boolean };
}

export type StoredResponse = ChatResponse | ErrorResponse;

export function isErrorResponse(r: StoredResponse | null): r is ErrorResponse {
  return r !== null && 'error' in r && !('response_id' in r);
}

// ── 단계 ───────────────────────────────────────────────────────────────

export type StepKind = 'model' | 'tool' | 'guardrail' | 'server';
export type ToolKind = 'query' | 'proposal' | 'briefing' | 'memory';
export type ToolStepStatus = 'success' | 'failed';
export type GuardrailLayer = 'input' | 'tool' | 'output' | 'limit';
export type ServerDecision = 'correction_requested' | 'cards_assembled' | 'limit_exceeded' | 'output_rejected' | 'input_blocked';

/** 한 실행의 단계. 종류별로 쓰는 필드만 값이 있고 나머지는 null이다. */
export interface AgentStep {
  seq: number;
  kind: StepKind;
  started_at: string;
  duration_ms: number;
  // model
  model: string | null;
  input_tokens: number | null;
  cached_tokens: number | null;
  output_tokens: number | null;
  reasoning_tokens: number | null;
  cost_usd: number | null;
  reasoning_summary: string | null;
  reasoning_summary_ko: string | null;
  /** 다음에 부를 도구 이름 또는 `final_response`. */
  next_action: string | null;
  // tool
  tool_name: string | null;
  tool_kind: ToolKind | null;
  status: ToolStepStatus | null;
  arguments: Record<string, unknown> | null;
  result: unknown;
  error_code: string | null;
  // guardrail
  guardrail_layer: GuardrailLayer | null;
  guardrail_name: string | null;
  passed: boolean | null;
  // guardrail·server 공통
  note: string | null;
  // server
  decision: ServerDecision | null;
}

export interface RunDetailResponse {
  run: RunListItem;
  input: RunInput;
  /** 저장된 채팅 응답 또는 오류 응답. 끝나지 않았으면 null. */
  response: StoredResponse | null;
  steps: AgentStep[];
}

// ── 세션 ───────────────────────────────────────────────────────────────

export interface SessionListItem {
  session_id: string;
  /** 세션의 턴 중 테스트 케이스 ID가 있으면 그 값(첫 턴 기준). 실제 요청만 있으면 null. */
  test_case_id: string | null;
  turns: number;
  test_turns: number;
  /** 정상이 아닌 턴 수. */
  attention_turns: number;
  model_calls: number;
  tool_calls: number;
  input_tokens: number;
  cached_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cost_usd: number | null;
  first_started_at: string;
  last_started_at: string;
  last_status: RunStatus;
  last_input_preview: string;
}

export interface SessionListResponse {
  items: SessionListItem[];
  next_cursor: string | null;
}

export interface SessionTurn {
  run: RunListItem;
  input: RunInput;
  response: StoredResponse | null;
  steps: AgentStep[];
}

export interface SessionDetailResponse {
  session: SessionListItem;
  /** 오래된 순. */
  turns: SessionTurn[];
  omitted_turns: number;
}

// ── 케이스·집계 ──────────────────────────────────────────────────────────

export interface CaseStat {
  test_case_id: string;
  runs: number;
  normal: number;
  tool_failed: number;
  blocked_input: number;
  limit_exceeded: number;
  output_rejected: number;
  error: number;
  avg_duration_ms: number | null;
  avg_model_calls: number | null;
  avg_tool_calls: number | null;
  avg_total_tokens: number | null;
  avg_cost_usd: number | null;
  last_started_at: string;
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
  avg_duration_ms: number | null;
}

export interface ShareStat {
  value: string;
  count: number;
  ratio: number;
}

export interface GuardrailStat {
  layer: GuardrailLayer;
  name: string;
  checks: number;
  blocked: number;
}

export interface StatsResponse {
  tools: ToolStat[];
  tool_kinds: ShareStat[];
  /** 모델을 부른 실행의 요청당 총 토큰. 최대 1,000개. */
  token_samples: number[];
  statuses: ShareStat[];
  guardrails: GuardrailStat[];
  cases: CaseStat[];
}

// ── 테스트 실행 ─────────────────────────────────────────────────────────

export type TestRunStatus = 'running' | 'done' | 'stopped';

/** 체크 항목을 판정한 쪽. 코드 판정으로 적은 항목도 정해진 표기가 아니면 채점 모델이 판정한다. */
export type CheckJudge = 'code' | 'grader';

export interface TestRunConfig {
  model: string;
  effort: string;
}

/** 체크 항목 하나의 판정. 판정하지 않았으면 passed·judged_by가 null이다. */
export interface TestCheckResult {
  passed: boolean | null;
  judged_by: CheckJudge | null;
  reason: string | null;
}

export interface TestAttemptItem {
  case_id: string;
  /** 실행 configs의 순서(0 = A) */
  config: number;
  /** 1부터 */
  repeat: number;
  finished_at: string;
  passed: boolean;
  /** 통과한 시도만 품질을 매긴다. */
  quality: 1 | 2 | 3 | null;
  latency_ms: number;
  model_calls: number;
  tool_calls: number;
  /** 단가가 없는 모델이면 null */
  cost_usd: number | null;
  checks: TestCheckResult[];
  reason: string;
  reply: string;
  turn_id: string | null;
  /** 실제로 응답한 채점 모델. 채점하지 않았으면 null */
  grader_model: string | null;
  grader_cost_usd: number | null;
}

export interface TestRunSummary {
  id: string;
  status: TestRunStatus;
  started_at: string;
  /** 진행 중이면 지금 시각, 끝났으면 finished_at */
  updated_at: string;
  finished_at: string | null;
  configs: TestRunConfig[];
  repeats: number;
  case_ids: string[];
  grader: TestRunConfig;
  done: number;
  total: number;
}

export interface TestRunDetailResponse extends TestRunSummary {
  /** 끝난 순서대로 */
  attempts: TestAttemptItem[];
}

export interface TestRunListResponse {
  /** 최근 시작한 실행부터 */
  items: TestRunSummary[];
}

/** 실행 시작 요청. case_file은 케이스 파일(testSet.json)을 그대로 보낸다. */
export interface TestRunCreateRequest {
  case_file: unknown;
  case_ids: string[];
  configs: TestRunConfig[];
  repeats: number;
}
