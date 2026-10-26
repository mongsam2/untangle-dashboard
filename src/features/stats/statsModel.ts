import type { CaseStat, GuardrailStat, RunStatus, RunSummaryStats, ShareStat, StatsResponse, ToolKind, ToolStat } from '../../api/types';
import type { KpiTile } from '../../components/Page';
import { caseTitle } from '../../lib/cases';
import { fmtCost, fmtInt, fmtMs } from '../../lib/format';
import { GUARD_LAYER, GUARD_LAYER_ORDER, KIND, rampColor, TOOL_KIND_ORDER, toolOrderIndex } from '../../lib/kinds';
import { RUN_STATUS, RUN_STATUS_ORDER } from '../../lib/status';

export interface DonutPart {
  label: string;
  v: number;
  color: string;
}

export interface Donut {
  name: string;
  total: number;
  unit: string;
  mono: boolean;
  ring: string;
  title: string;
  items: { label: string; color: string; count: string; pct: string }[];
}

/** 조각 사이에 흰 틈을 둔 conic-gradient 배경. */
export function ringBackground(parts: DonutPart[]): string {
  if (!parts.length) return 'var(--data-track)';
  const total = parts.reduce((a, x) => a + x.v, 0) || 1;
  let at = 0;
  const stops: string[] = [];
  for (const x of parts) {
    const deg = (x.v / total) * 360;
    const gap = parts.length > 1 ? Math.min(1.2, deg / 4) : 0;
    stops.push(`${x.color} ${at.toFixed(2)}deg ${(at + deg - gap).toFixed(2)}deg`, `var(--surface-document) ${(at + deg - gap).toFixed(2)}deg ${(at + deg).toFixed(2)}deg`);
    at += deg;
  }
  return 'conic-gradient(' + stops.join(', ') + ')';
}

function donut(name: string, parts: DonutPart[], unit: string, mono: boolean): Donut {
  const total = parts.reduce((a, x) => a + x.v, 0);
  return {
    name,
    total,
    unit,
    mono,
    ring: ringBackground(parts),
    title: parts.map((x) => x.label + ' ' + x.v + '회').join(', '),
    items: parts.map((x) => ({ label: x.label, color: x.color, count: x.v + '회', pct: (total ? (x.v / total) * 100 : 0).toFixed(0) + '%' })),
  };
}

/** 종류별 도구를 호출 많은 순(같으면 정해진 도구 순)으로 정렬하고 램프 색을 붙인다. */
export function toolsByKind(tools: ToolStat[], kind: ToolKind): (ToolStat & { color: string })[] {
  return tools
    .filter((t) => t.tool_kind === kind && t.calls > 0)
    .sort((a, b) => b.calls - a.calls || toolOrderIndex(a.tool_name) - toolOrderIndex(b.tool_name) || a.tool_name.localeCompare(b.tool_name))
    .map((t, i) => ({ ...t, color: rampColor(kind, i) }));
}

export function toolDonuts(stats: StatsResponse): Donut[] {
  const kindCount = (k: ToolKind) => stats.tool_kinds.find((x) => x.value === k)?.count ?? 0;
  const q = toolsByKind(stats.tools, 'query');
  const p = toolsByKind(stats.tools, 'proposal');
  return [
    donut(
      '조회 · 제안 · 브리핑',
      TOOL_KIND_ORDER.map((k) => ({ label: KIND[k].label + ' 도구', v: kindCount(k), color: KIND[k].color })).filter((x) => x.v > 0),
      '회 호출',
      false,
    ),
    donut('조회 도구 안에서', q.map((t) => ({ label: t.tool_name, v: t.calls, color: t.color })), '회 조회', true),
    donut('제안 도구 안에서', p.map((t) => ({ label: t.tool_name, v: t.calls, color: t.color })), '회 제안', true),
  ];
}

export type ToolSort = 'rate' | 'count';

export interface ToolRow {
  name: string;
  kind: string;
  color: string;
  count: number;
  fails: number;
  rate: number;
  avgMs: string;
}

export function toolRows(stats: StatsResponse, sort: ToolSort): ToolRow[] {
  const rows = TOOL_KIND_ORDER.flatMap((k) => toolsByKind(stats.tools, k)).map((t) => ({
    name: t.tool_name,
    kind: KIND[t.tool_kind].label,
    color: t.color,
    count: t.calls,
    fails: t.failed,
    rate: t.calls ? t.failed / t.calls : 0,
    avgMs: fmtMs(t.avg_duration_ms),
  }));
  // 정렬이 같으면 원래 순서(종류·호출 수)를 지킨다.
  return rows.sort((a, b) => (sort === 'rate' ? b.rate - a.rate || b.count - a.count : b.count - a.count || b.rate - a.rate));
}

export interface GuardRow {
  layer: string;
  name: string;
  checks: number;
  blocked: number;
  rate: number;
}

/** 가드레일 표. 층 순서(입력 → 도구 → 출력 → 한도) 안에서 차단 많은 순이다. */
export function guardRows(guardrails: GuardrailStat[]): GuardRow[] {
  return [...guardrails]
    .sort((a, b) => GUARD_LAYER_ORDER.indexOf(a.layer) - GUARD_LAYER_ORDER.indexOf(b.layer) || b.blocked - a.blocked || b.checks - a.checks)
    .map((g) => ({ layer: GUARD_LAYER[g.layer].short, name: g.name, checks: g.checks, blocked: g.blocked, rate: g.checks ? g.blocked / g.checks : 0 }));
}

export interface ShareSeg {
  label: string;
  value: string;
  pct: string;
  color: string;
  title: string;
}

export function statusSegs(shares: ShareStat[]): ShareSeg[] {
  const total = Math.max(1, shares.reduce((a, x) => a + x.count, 0));
  return RUN_STATUS_ORDER.map((v) => ({ v, count: shares.find((x) => x.value === v)?.count ?? 0 }))
    .filter((x) => x.count > 0)
    .map((x) => {
      const pct = (x.count / total) * 100;
      const tone = RUN_STATUS[x.v as RunStatus];
      return { label: tone.label, value: x.count + '건 · ' + pct.toFixed(0) + '%', pct: pct.toFixed(2), color: tone.dot === 'var(--status-error-dot)' ? 'var(--surface-inverse)' : tone.dot, title: tone.label + ' ' + x.count + '건' };
    });
}

/** 집계 화면 KPI. 합계·최대값·캐시 입력은 모두 서버 요약 수치(필터 조건 전체)에서 온다. */
export function statTiles(summary: RunSummaryStats | undefined): KpiTile[] {
  const input = summary?.total_input_tokens ?? 0;
  const cached = summary?.total_cached_tokens ?? 0;
  return [
    { label: '평균 모델 호출', value: (summary?.avg_model_calls ?? 0).toFixed(1) + '회', sub: '총 ' + fmtInt(summary?.total_model_calls ?? 0) + '회' },
    { label: '평균 도구 호출', value: (summary?.avg_tool_calls ?? 0).toFixed(1) + '회', sub: '총 ' + fmtInt(summary?.total_tool_calls ?? 0) + '회' },
    { label: '보정 요청', value: fmtInt(summary?.total_corrections ?? 0) + '회', sub: '형식·업무 오류로 모델에게 다시 시킨 횟수' },
    { label: '캐시 적중률', value: (input ? (cached / input) * 100 : 0).toFixed(1) + '%', sub: '캐시 입력 ' + fmtInt(cached) + ' 토큰' },
    { label: '평균 소요시간', value: fmtMs(Math.round(summary?.avg_duration_ms ?? 0)), sub: '최대 ' + fmtMs(summary?.max_duration_ms ?? 0) },
  ];
}

export interface CaseRow {
  id: string;
  title: string;
  runs: number;
  avgModel: string;
  avgTokens: string;
  avgCost: string;
  normal: number;
  attention: number;
  worst: RunStatus | null;
}

/** 케이스 표. 평균은 서버가 케이스의 전체 실행으로 계산한 값이다. */
export function caseRows(cases: CaseStat[]): CaseRow[] {
  return cases.map((c) => {
    const attention = c.tool_failed + c.blocked_input + c.limit_exceeded + c.output_rejected + c.error;
    const worst = (['error', 'output_rejected', 'limit_exceeded', 'blocked_input', 'tool_failed'] as const).find((k) => c[k] > 0) ?? null;
    return {
      id: c.test_case_id,
      title: caseTitle(c.test_case_id),
      runs: c.runs,
      avgModel: c.avg_model_calls === null ? '-' : c.avg_model_calls.toFixed(1),
      avgTokens: fmtInt(c.avg_total_tokens ?? 0),
      avgCost: fmtCost(c.avg_cost_usd),
      normal: c.normal,
      attention,
      worst,
    };
  });
}
