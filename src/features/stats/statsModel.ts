import type { CaseStat, RunListItem, RunPath, RunStatus, RunSummaryStats, ShareStat, StatsResponse, ToolKind, ToolStat } from '../../api/types';
import { caseTitle } from '../../lib/cases';
import { fmtCost, fmtInt, fmtMs } from '../../lib/format';
import { KIND, rampColor, toolOrderIndex } from '../../lib/kinds';
import { PATH_COLOR, PATH_LABEL, RUN_STATUS, RUN_STATUS_ORDER } from '../../lib/status';
import type { KpiTile } from '../runs/KpiHero';

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
  if (!parts.length) return 'var(--color-divider)';
  const total = parts.reduce((a, x) => a + x.v, 0) || 1;
  let at = 0;
  const stops: string[] = [];
  for (const x of parts) {
    const deg = (x.v / total) * 360;
    const gap = parts.length > 1 ? Math.min(1.2, deg / 4) : 0;
    stops.push(`${x.color} ${at.toFixed(2)}deg ${(at + deg - gap).toFixed(2)}deg`, `var(--color-canvas) ${(at + deg - gap).toFixed(2)}deg ${(at + deg).toFixed(2)}deg`);
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
  const q = toolsByKind(stats.tools, 'query');
  const m = toolsByKind(stats.tools, 'mutation');
  const kindCount = (k: ToolKind) => stats.tool_kinds.find((x) => x.value === k)?.count ?? 0;
  return [
    donut(
      '조회 · 변경 비율',
      [
        { label: '조회 도구', v: kindCount('query'), color: KIND.query.color },
        { label: '변경 도구', v: kindCount('mutation'), color: KIND.mutation.color },
      ].filter((x) => x.v > 0),
      '회 호출',
      false,
    ),
    donut('조회 도구 안에서', q.map((t) => ({ label: t.tool_name, v: t.calls, color: t.color })), '회 조회', true),
    donut('변경 도구 안에서', m.map((t) => ({ label: t.tool_name, v: t.calls, color: t.color })), '회 변경', true),
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
}

/** 도구 표. 실패는 failed와 unknown을 합친다. */
export function toolRows(stats: StatsResponse, sort: ToolSort): ToolRow[] {
  const rows = [...toolsByKind(stats.tools, 'query'), ...toolsByKind(stats.tools, 'mutation')].map((t) => {
    const fails = t.failed + t.unknown;
    return { name: t.tool_name, kind: KIND[t.tool_kind].label, color: t.color, count: t.calls, fails, rate: t.calls ? fails / t.calls : 0 };
  });
  // 정렬이 같으면 원래 순서(종류·호출 수)를 지킨다.
  return rows.sort((a, b) => (sort === 'rate' ? b.rate - a.rate || b.count - a.count : b.count - a.count || b.rate - a.rate));
}

export interface ShareSeg {
  label: string;
  value: string;
  pct: string;
  color: string;
  title: string;
}

function segs(shares: ShareStat[], order: string[], label: (v: string) => string, color: (v: string) => string): ShareSeg[] {
  const total = Math.max(1, shares.reduce((a, x) => a + x.count, 0));
  return order
    .map((v) => ({ v, count: shares.find((x) => x.value === v)?.count ?? 0 }))
    .filter((x) => x.count > 0)
    .map((x) => {
      const pct = (x.count / total) * 100;
      return { label: label(x.v), value: x.count + '건 · ' + pct.toFixed(0) + '%', pct: pct.toFixed(2), color: color(x.v), title: label(x.v) + ' ' + x.count + '건' };
    });
}

export function shareBlocks(stats: StatsResponse): { title: string; segs: ShareSeg[] }[] {
  return [
    {
      title: '처리 경로 비율',
      segs: segs(stats.paths, ['model', 'accept_direct', 'reject_direct'], (v) => PATH_LABEL[v as RunPath], (v) => PATH_COLOR[v as RunPath]),
    },
    {
      title: '상태 비율',
      segs: segs(stats.statuses, RUN_STATUS_ORDER, (v) => RUN_STATUS[v as RunStatus].label, (v) => RUN_STATUS[v as RunStatus].dot),
    },
  ];
}

/** 집계 화면 KPI. 캐시 적중률과 최대 소요시간은 요약 API에 없어 목록 전체에서 계산한다. */
export function statTiles(summary: RunSummaryStats | undefined, all: RunListItem[] | undefined): KpiTile[] {
  const runs = summary?.runs ?? 0;
  const models = Math.round((summary?.avg_model_calls ?? 0) * runs);
  const tools = Math.round((summary?.avg_tool_calls ?? 0) * runs);
  const input = all?.reduce((a, r) => a + r.input_tokens, 0) ?? 0;
  const cached = all?.reduce((a, r) => a + r.cached_tokens, 0) ?? 0;
  const maxMs = Math.max(0, ...(all ?? []).map((r) => r.duration_ms));
  return [
    { label: '평균 모델 호출', value: (summary?.avg_model_calls ?? 0).toFixed(1) + '회', sub: '총 ' + models + '회' },
    { label: '평균 도구 호출', value: (summary?.avg_tool_calls ?? 0).toFixed(1) + '회', sub: '총 ' + tools + '회' },
    { label: '캐시 적중률', value: (input ? (cached / input) * 100 : 0).toFixed(1) + '%', sub: '캐시 입력 ' + fmtInt(cached) + ' 토큰' },
    { label: '평균 소요시간', value: fmtMs(Math.round(summary?.avg_duration_ms ?? 0)), sub: '최대 ' + fmtMs(maxMs) },
  ];
}

export interface CaseRow {
  id: string;
  title: string;
  runs: number;
  avgModel: string;
  avgTokens: string;
  avgCost: string;
  warn: number;
  unknown: number;
}

/** 케이스 표. 평균 모델 호출은 CaseStat에 없어 목록 전체에서 계산한다. */
export function caseRows(cases: CaseStat[], all: RunListItem[] | undefined): CaseRow[] {
  return cases.map((c) => {
    const rs = all?.filter((r) => r.test_case_id === c.test_case_id) ?? [];
    return {
      id: c.test_case_id,
      title: caseTitle(c.test_case_id),
      runs: c.runs,
      avgModel: rs.length ? (rs.reduce((a, r) => a + r.model_calls, 0) / rs.length).toFixed(1) : '-',
      avgTokens: fmtInt(c.avg_total_tokens ?? 0),
      avgCost: fmtCost(c.avg_cost_usd),
      warn: c.tool_failed,
      unknown: c.outcome_unknown,
    };
  });
}
