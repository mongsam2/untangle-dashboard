// 서버가 SQL로 계산할 요약·집계를 예시 데이터에서 같은 모양으로 계산한다.
import type {
  AgentStep,
  CaseStat,
  GuardrailStat,
  RunDetailResponse,
  RunFilters,
  RunListItem,
  RunStatus,
  RunSummaryStats,
  SessionListItem,
  ShareStat,
  StatsResponse,
  ToolKind,
  ToolStat,
} from '../types';
import { GUARD_LAYER_ORDER, TOOL_KIND_ORDER, toolOrderIndex } from '../../lib/kinds';
import { RUN_STATUS_ORDER } from '../../lib/status';

export const TOKEN_SAMPLE_LIMIT = 1000;
export const CASE_RUN_LIMIT = 100;
export const SESSION_TURN_LIMIT = 100;

export function matchesFilters(run: RunListItem, f: RunFilters): boolean {
  const source = f.source ?? 'all';
  if (source === 'test' && run.test_case_id === null) return false;
  if (source === 'real' && run.test_case_id !== null) return false;
  if (f.status && run.status !== f.status) return false;
  return true;
}

// SQL 집계 함수와 같은 규칙: sum·avg·max는 null을 건너뛰고, 행이 없으면 null이다.
const sum = (xs: number[]): number => xs.reduce((a, x) => a + x, 0);
const avg = (xs: number[]): number | null => (xs.length ? sum(xs) / xs.length : null);
const totalTokens = (r: RunListItem) => r.input_tokens + r.output_tokens;
const costs = (items: RunListItem[]) => items.map((r) => r.cost_usd).filter((c): c is number => c !== null);
const durations = (items: RunListItem[]) => items.map((r) => r.duration_ms).filter((d): d is number => d !== null);

/** 한 세션의 턴들(시작 순서)을 세션 목록 항목으로 합친다. */
export function sessionItem(runs: RunListItem[]): SessionListItem {
  const first = runs[0]!;
  const last = runs[runs.length - 1]!;
  const cost = costs(runs);
  const total = (pick: (r: RunListItem) => number) => sum(runs.map(pick));
  return {
    session_id: first.session_id,
    test_case_id: runs.find((r) => r.test_case_id !== null)?.test_case_id ?? null,
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
    first_started_at: first.started_at,
    last_started_at: last.started_at,
    last_status: last.status,
    last_input_preview: last.input_preview,
  };
}

export function summarize(items: RunListItem[]): RunSummaryStats {
  const count = (pred: (r: RunListItem) => boolean) => items.filter(pred).length;
  const cost = costs(items);
  const dur = durations(items);
  return {
    runs: items.length,
    test_runs: count((r) => r.test_case_id !== null),
    real_runs: count((r) => r.test_case_id === null),
    normal_runs: count((r) => r.status === 'normal'),
    tool_failed_runs: count((r) => r.status === 'tool_failed'),
    blocked_input_runs: count((r) => r.status === 'blocked_input'),
    limit_exceeded_runs: count((r) => r.status === 'limit_exceeded'),
    output_rejected_runs: count((r) => r.status === 'output_rejected'),
    error_runs: count((r) => r.status === 'error'),
    model_runs: count((r) => r.model_calls > 0),
    total_model_calls: sum(items.map((r) => r.model_calls)),
    avg_model_calls: avg(items.map((r) => r.model_calls)),
    total_tool_calls: sum(items.map((r) => r.tool_calls)),
    avg_tool_calls: avg(items.map((r) => r.tool_calls)),
    total_corrections: sum(items.map((r) => r.corrections)),
    total_tokens: sum(items.map(totalTokens)),
    avg_total_tokens: avg(items.map(totalTokens)),
    total_input_tokens: sum(items.map((r) => r.input_tokens)),
    total_cached_tokens: sum(items.map((r) => r.cached_tokens)),
    total_output_tokens: sum(items.map((r) => r.output_tokens)),
    total_reasoning_tokens: sum(items.map((r) => r.reasoning_tokens)),
    total_cost_usd: cost.length ? sum(cost) : null,
    avg_cost_usd: avg(cost),
    avg_duration_ms: avg(dur),
    max_duration_ms: dur.length ? Math.max(...dur) : null,
  };
}

export function caseStat(id: string, items: RunListItem[]): CaseStat {
  const count = (s: RunStatus) => items.filter((r) => r.status === s).length;
  return {
    test_case_id: id,
    runs: items.length,
    normal: count('normal'),
    tool_failed: count('tool_failed'),
    blocked_input: count('blocked_input'),
    limit_exceeded: count('limit_exceeded'),
    output_rejected: count('output_rejected'),
    error: count('error'),
    avg_duration_ms: avg(durations(items)),
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
    .filter((x) => x.count > 0)
    .map((x) => ({ ...x, ratio: total ? x.count / total : 0 }));
}

function toolStats(steps: AgentStep[]): ToolStat[] {
  const byName = new Map<string, AgentStep[]>();
  for (const s of steps) {
    if (s.kind !== 'tool' || !s.tool_name) continue;
    byName.set(s.tool_name, [...(byName.get(s.tool_name) ?? []), s]);
  }
  return [...byName.entries()]
    .map(([name, calls]) => ({
      tool_name: name,
      tool_kind: (calls[0]!.tool_kind ?? 'query') as ToolKind,
      calls: calls.length,
      failed: calls.filter((c) => c.status === 'failed').length,
      avg_duration_ms: avg(calls.map((c) => c.duration_ms)),
    }))
    .sort((a, b) => b.calls - a.calls || toolOrderIndex(a.tool_name) - toolOrderIndex(b.tool_name));
}

function guardrailStats(steps: AgentStep[]): GuardrailStat[] {
  const map = new Map<string, GuardrailStat>();
  for (const s of steps) {
    if (s.kind !== 'guardrail' || !s.guardrail_layer || !s.guardrail_name) continue;
    const key = s.guardrail_layer + '/' + s.guardrail_name;
    const cur = map.get(key) ?? { layer: s.guardrail_layer, name: s.guardrail_name, checks: 0, blocked: 0 };
    cur.checks += 1;
    if (s.passed === false) cur.blocked += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => GUARD_LAYER_ORDER.indexOf(a.layer) - GUARD_LAYER_ORDER.indexOf(b.layer) || b.checks - a.checks || a.name.localeCompare(b.name));
}

export function computeStats(data: RunDetailResponse[]): StatsResponse {
  const runs = data.map((d) => d.run);
  const steps = data.flatMap((d) => d.steps);
  const toolSteps = steps.filter((s) => s.kind === 'tool');
  const caseIds = [...new Set(runs.map((r) => r.test_case_id).filter((id): id is string => id !== null))].sort();
  return {
    tools: toolStats(steps),
    tool_kinds: shares(toolSteps.map((s) => s.tool_kind ?? 'query'), TOOL_KIND_ORDER),
    // 모델을 부른 실행만, 최신순 1,000개.
    token_samples: runs.filter((r) => r.model_calls > 0).slice(0, TOKEN_SAMPLE_LIMIT).map(totalTokens),
    statuses: shares(runs.map((r) => r.status), RUN_STATUS_ORDER),
    guardrails: guardrailStats(steps),
    cases: caseIds.map((id) => caseStat(id, runs.filter((r) => r.test_case_id === id))),
  };
}
