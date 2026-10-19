// 서버가 SQL로 계산할 요약·집계를 예시 데이터에서 같은 모양으로 계산한다.
import type {
  CaseStat,
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

export function matchesFilters(run: RunListItem, f: RunFilters): boolean {
  const source = f.source ?? 'all';
  if (source === 'test' && run.test_case_id === null) return false;
  if (source === 'real' && run.test_case_id !== null) return false;
  if (f.path && run.path !== f.path) return false;
  if (f.status && run.status !== f.status) return false;
  return true;
}

const avg = (xs: number[]): number | null => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : null);
const totalTokens = (r: RunListItem) => r.input_tokens + r.output_tokens;

function sumCost(items: RunListItem[]): number | null {
  const costs = items.map((r) => r.cost_usd).filter((c): c is number => c !== null);
  return costs.length ? costs.reduce((a, c) => a + c, 0) : null;
}

export function summarize(items: RunListItem[]): RunSummaryStats {
  const total = sumCost(items);
  return {
    runs: items.length,
    test_runs: items.filter((r) => r.test_case_id !== null).length,
    real_runs: items.filter((r) => r.test_case_id === null).length,
    attention_runs: items.filter((r) => r.status !== 'normal').length,
    avg_duration_ms: avg(items.map((r) => r.duration_ms)),
    avg_model_calls: avg(items.map((r) => r.model_calls)),
    avg_tool_calls: avg(items.map((r) => r.tool_calls)),
    avg_total_tokens: avg(items.map(totalTokens)),
    total_cost_usd: total,
    avg_cost_usd: total === null || !items.length ? null : total / items.length,
  };
}

export function caseStat(id: string, items: RunListItem[]): CaseStat {
  const count = (s: RunStatus) => items.filter((r) => r.status === s).length;
  const total = sumCost(items);
  return {
    test_case_id: id,
    runs: items.length,
    normal: count('normal'),
    tool_failed: count('tool_failed'),
    outcome_unknown: count('outcome_unknown'),
    error: count('error'),
    avg_duration_ms: avg(items.map((r) => r.duration_ms)),
    avg_tool_calls: avg(items.map((r) => r.tool_calls)),
    avg_total_tokens: avg(items.map(totalTokens)),
    avg_cost_usd: total === null || !items.length ? null : total / items.length,
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

  const caseIds: string[] = [];
  for (const r of runs) if (r.test_case_id && !caseIds.includes(r.test_case_id)) caseIds.push(r.test_case_id);
  const cases = caseIds
    .map((id) => caseStat(id, runs.filter((r) => r.test_case_id === id)))
    .sort((a, b) => b.last_started_at.localeCompare(a.last_started_at));

  return {
    tools: toolStats,
    tool_kinds: shares(kinds, ['query', 'mutation']),
    // 서버처럼 최근 1000건만 보낸다.
    token_samples: [...runs]
      .sort((a, b) => b.started_at.localeCompare(a.started_at))
      .slice(0, TOKEN_SAMPLE_LIMIT)
      .map(totalTokens),
    paths: shares(runs.map((r) => r.path), PATHS),
    statuses: shares(runs.map((r) => r.status), STATUSES),
    cases,
  };
}
