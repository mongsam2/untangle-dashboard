/*
 * 대시보드 조회 API 타입.
 *
 * 정본은 `bun run gen:api`가 서버의 OpenAPI 문서에서 만든 `schema.d.ts`다. 이 파일은 화면 코드가
 * 짧은 이름으로 쓰도록 생성된 타입에 별칭만 붙인다. 서버 스키마가 바뀌면 이 파일을 고치지 말고
 * 서버를 띄운 뒤 `bun run gen:api`를 다시 실행한다. UUID·시각은 문자열로 받는다.
 */
import type { components, operations } from './schema';

type Schemas = components['schemas'];
type Query<K extends keyof operations> = NonNullable<operations[K]['parameters']['query']>;

// ── 필터 ───────────────────────────────────────────────────────────────

export type RunSource = Schemas['RunSource'];
export type RunPath = Schemas['RunPath'];
export type RunStatus = Schemas['RunStatus'];
export type StepKind = Schemas['StepKind'];

/** 목록·집계가 함께 쓰는 조회 조건(`GET /stats`의 검색어). */
export type RunFilters = Query<'get_stats_v1_dashboard_stats_get'>;
/** 목록 조회 조건에 페이지 크기와 커서를 더한 것(`GET /runs`의 검색어). */
export type RunPage = Query<'list_runs_v1_dashboard_runs_get'>;
/** 대화 목록 조회 조건(`GET /conversations`의 검색어). 출처 필터만 있다. */
export type ConversationPage = Query<'list_conversations_v1_dashboard_conversations_get'>;

// ── 응답 ───────────────────────────────────────────────────────────────

export type RunListItem = Schemas['RunListItem'];
export type RunSummaryStats = Schemas['RunSummaryStats'];
export type RunListResponse = Schemas['RunListResponse'];
export type AgentStep = Schemas['AgentStep'];
export type RunDetailResponse = Schemas['RunDetailResponse'];
export type ConversationListItem = Schemas['ConversationListItem'];
export type ConversationListResponse = Schemas['ConversationListResponse'];
export type ConversationTurn = Schemas['ConversationTurn'];
export type ConversationDetailResponse = Schemas['ConversationDetailResponse'];
export type CaseStat = Schemas['CaseStat'];
export type CaseDetailResponse = Schemas['CaseDetailResponse'];
export type ToolStat = Schemas['ToolStat'];
export type ShareStat = Schemas['ShareStat'];
export type StatsResponse = Schemas['StatsResponse'];

export type ToolKind = ToolStat['tool_kind'];
export type ServerDecision = NonNullable<AgentStep['decision']>;

// ── 요청 입력·최종 응답 ─────────────────────────────────────────────────

export type ChatInput = Schemas['ChatInput'];
export type HistoryMessage = Schemas['HistoryMessage'];
export type ChatResponse = Schemas['ChatResponse'];
export type ErrorResponse = Schemas['ErrorResponse'];
export type ErrorDetail = Schemas['ErrorDetail'];
export type MutationResult = Schemas['MutationResult'];
export type MutationOutcome = Schemas['MutationOutcome'];
export type NoteState = Schemas['NoteState'];
export type Goal = Schemas['Goal'];
export type Challenge = Schemas['Challenge'];
export type ChallengeCategory = Schemas['ChallengeCategory'];
export type Proposal = Schemas['Proposal'];
export type ProposalChange = Schemas['ProposalChange'];
export type ProposalView = Schemas['ProposalView'];
export type ChatView = Schemas['ChatView'];
export type GoalDetail = Schemas['GoalDetail'];
export type OperationResult = Schemas['OperationResult'];
export type JsonObject = Schemas['JsonObject'];

/**
 * 대화 응답을 만들지 못한 오류 응답인지. `ChatResponse`도 답변이 실패하면 `error`를 담으므로
 * `error` 키로 가르지 않고, 대화 응답에만 있는 `message`로 가른다.
 */
export function isErrorResponse(r: ChatResponse | ErrorResponse | null): r is ErrorResponse {
  return r !== null && !('message' in r);
}
