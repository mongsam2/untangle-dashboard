import type { RunSummaryStats } from '../../api/types';
import { fmtCost, fmtInt } from '../../lib/format';
import type { KpiTile } from './KpiHero';

const pct = (part: number, whole: number) => ((whole ? part / whole : 0) * 100).toFixed(1) + '%';

/** 요청 목록 위 KPI. 건수·합계는 모두 서버 요약 수치(필터 조건 전체)에서 온다. */
export function listTiles(summary: RunSummaryStats | undefined): KpiTile[] {
  const runs = summary?.runs ?? 0;
  const warn = summary?.tool_failed_runs ?? 0;
  const unknown = summary?.outcome_unknown_runs ?? 0;
  return [
    { label: '요청 수', value: String(runs), sub: '모델 경유 ' + (summary?.model_runs ?? 0) + '건' },
    { label: '평균 토큰', value: fmtInt(summary?.avg_total_tokens ?? 0), sub: '총 ' + fmtInt(summary?.total_tokens ?? 0) + ' 토큰' },
    { label: '총 비용', value: fmtCost(runs ? summary?.total_cost_usd : 0), sub: '요청당 ' + fmtCost(runs ? summary?.avg_cost_usd : 0) },
    { label: '도구 실패 비율', value: pct(warn, runs), sub: warn + '건' },
    { label: '반영 미확인 비율', value: pct(unknown, runs), sub: unknown + '건' },
  ];
}
