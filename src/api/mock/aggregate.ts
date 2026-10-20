// 서버가 SQL로 계산할 요약·집계를 예시 데이터에서 같은 모양으로 계산한다.
import type {
  CaseStat,
  ConversationListItem,
  RunDetailResponse,
  RunFilters,
  RunListItem,
  RunPath,
  RunStatus,
  RunSummaryStats,
  ShareStat,
  StatsResponse,
  ToolKind,
  ToolStat,
} from '../types';

const PATHS: RunPath[] = ['model', 'accept_direct', 'reject_direct'];
const STATUSES: RunStatus[] = ['normal', 'tool_failed', 'outcome_unknown', 'error'];
export const TOKEN_SAMPLE_LIMIT = 1000;
export const CASE_RUN_LIMIT = 100;
export const CONVERSATION_TURN_LIMIT = 100;

export function matchesFilters(run: RunListItem, f: RunFilters): boolean {
  const source = f.source ?? 'all';
  if (source === 'test' && run.test_case_id === null) return false;
  if (source === 'real' && run.test_case_id !== null) return false;
  if (f.path && run.path !== f.path) return false;
  if (f.status && run.status !== f.status) return false;
  return true;
}

// SQL 집계 함수와 같은 규칙: sum·avg·max는 null을 건너뛰고, 행이 없으면 null이다.
const sum = (xs: number[]): number => xs.reduce((a, x) => a + x, 0);
const avg = (xs: number[]): number | null => (xs.length ? sum(xs) / xs.length : null);
const totalTokens = (r: RunListItem) => r.input_tokens + r.output_tokens;
const costs = (items: RunListItem[]) => items.map((r) => r.cost_usd).filter((c): c is number => c !== null);

/** 한 대화의 요청들(시작 순서)을 대화 목록 항목으로 합친다. 서버의 대화 집계 SQL과 같은 규칙이다. */
export function conversationItem(runs: RunListItem[], userId: string): ConversationListItem {
  const first = runs[0]!;
  const last = runs[runs.length - 1]!;
  const cost = costs(runs);
  const total = (pick: (r: RunListItem) => number) => sum(runs.map(pick));
  return {
    conversation_id: first.conversation_id,
    user_id: userId,
    turns: runs.length,
    test_turns: runs.filter((r) => r.test_case_id !== null).length,
    attention_turns: runs.filter((r) => r.status !== 'normal').length,
    model_calls: total((r) => r.model_calls),
    tool_calls: total((r) => r.tool_calls),
    input_tokens: total((r) => r.input_tokens),
    cached_tokens: total((r) => r.cached_tokens),
    output_tokens: total((r) => r.output_tokens),
    reasoning_tokens: total((r) => r.reasoning_tokens),
    cost_usd: cost.length ? sum(cost) : null,
    duration_ms: total((r) => r.duration_ms),
    started_at: first.started_at,
    last_started_at: last.started_at,
    first_input_preview: first.input_preview,
    last_input_preview: last.input_preview,
  };
}

export function summarize(items: RunListItem[]): RunSummaryStats {
  const count = (pred: (r: RunListItem) => boolean) => items.filter(pred).length;
  const cost = costs(items);
  return {
    runs: items.length,
    test_runs: count((r) => r.test_case_id !== null),
    real_runs: count((r) => r.test_case_id === null),
    attention_runs: count((r) => r.status !== 'normal'),
    model_runs: count((r) => r.path === 'model'),
    tool_failed_runs: count((r) => r.status === 'tool_failed'),
    outcome_unknown_runs: count((r) => r.status === 'outcome_unknown'),
    error_runs: count((r) => r.status === 'error'),
    avg_duration_ms: avg(items.map((r) => r.duration_ms)),
    max_duration_ms: items.length ? Math.max(...items.map((r) => r.duration_ms)) : null,
    avg_model_calls: avg(items.map((r) => r.model_calls)),
    total_model_calls: sum(items.map((r) => r.model_calls)),
    avg_tool_calls: avg(items.map((r) => r.tool_calls)),
    total_tool_calls: sum(items.map((r) => r.tool_calls)),
    avg_total_tokens: avg(items.map(totalTokens)),
    total_tokens: sum(items.map(totalTokens)),
    total_input_tokens: sum(items.map((r) => r.input_tokens)),
    total_cached_tokens: sum(items.map((r) => r.cached_tokens)),
    total_cost_usd: cost.length ? sum(cost) : null,
    avg_cost_usd: avg(cost),
  };
}

export function caseStat(id: string, items: RunListItem[]): CaseStat {
  const count = (s: RunStatus) => items.filter((r) => r.status === s).length;
  return {
    test_case_id: id,
    runs: items.length,
    normal: count('normal'),
    tool_failed: count('tool_failed'),
    outcome_unknown: count('outcome_unknown'),
    error: count('error'),
    avg_duration_ms: avg(items.map((r) => r.duration_ms)),
    avg_model_calls: avg(items.map((r) => r.model_calls)),
    avg_tool_calls: avg(items.map((r) => r.tool_calls)),
    avg_total_tokens: avg(items.map(totalTokens)),
    avg_cost_usd: avg(costs(items)),
    last_started_at: items.map((r) => r.started_at).sort().at(-1) ?? '',
  };
}

function shares<T extends string>(values: T[], order: T[]): ShareStat[] {
  const total = values.length;
  return order
    .map((v) => ({ value: v, count: values.filter((x) => x === v).length }))
    .filter((s) => s.count > 0)
    .map((s) => ({ ...s, ratio: total ? s.count / total : 0 }));
}

export function computeStats(details: RunDetailResponse[]): StatsResponse {
  const runs = details.map((d) => d.run);
  const tools = new Map<string, { kind: ToolKind; calls: number; failed: number; unknown: number; ms: number }>();
  const kinds: ToolKind[] = [];
  for (const d of details) {
    for (const s of d.steps) {
      if (s.kind !== 'tool' || !s.tool_name) continue;
      const kind = s.tool_kind ?? 'query';
      kinds.push(kind);
      const t = tools.get(s.tool_name) ?? { kind, calls: 0, failed: 0, unknown: 0, ms: 0 };
      t.calls++;
      t.ms += s.duration_ms;
      if (s.status === 'failed') t.failed++;
      if (s.status === 'unknown') t.unknown++;
      tools.set(s.tool_name, t);
    }
  }
  const toolStats: ToolStat[] = [...tools.entries()]
    .map(([name, t]) => ({
      tool_name: name,
      tool_kind: t.kind,
      calls: t.calls,
      failed: t.failed,
      unknown: t.unknown,
      avg_duration_ms: t.calls ? t.ms / t.calls : null,
    }))
    .sort((a, b) => b.calls - a.calls || a.tool_name.localeCompare(b.tool_name));

  // 서버처럼 케이스 ID 순이다.
  const caseIds = [...new Set(runs.flatMap((r) => (r.test_case_id ? [r.test_case_id] : [])))].sort();
  const cases = caseIds.map((id) => caseStat(id, runs.filter((r) => r.test_case_id === id)));

  return {
    tools: toolStats,
    // 서버는 tool_kind 문자열 순으로 준다.
    tool_kinds: shares(kinds, ['mutation', 'query']),
    // 서버처럼 모델을 부른 요청만, 최근 1000건까지 보낸다(runs는 이미 최신순이다).
    token_samples: runs
      .filter((r) => r.model_calls > 0)
      .slice(0, TOKEN_SAMPLE_LIMIT)
      .map(totalTokens),
    paths: shares(runs.map((r) => r.path), PATHS),
    statuses: shares(runs.map((r) => r.status), STATUSES),
    cases,
  };
}
