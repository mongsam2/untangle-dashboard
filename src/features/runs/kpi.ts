import type { RunSummaryStats, ShareStat, StatsResponse } from '../../api/types';
import { fmtCost, fmtInt } from '../../lib/format';
import type { KpiTile } from './KpiHero';

export function shareCount(shares: ShareStat[] | undefined, value: string): number {
  return shares?.find((x) => x.value === value)?.count ?? 0;
}

/** 요청 목록 위 KPI. 요약 API와 집계 API(경로·상태 건수, 요청당 토큰)를 합쳐 만든다. */
export function listTiles(summary: RunSummaryStats | undefined, stats: StatsResponse | undefined): KpiTile[] {
  const runs = summary?.runs ?? 0;
  const n = Math.max(runs, 1);
  // token_samples는 최근 1000건으로 잘리므로 합계는 평균 × 건수로 구한다.
  const totalTok = (summary?.avg_total_tokens ?? 0) * runs;
  const warn = shareCount(stats?.statuses, 'tool_failed');
  const unknown = shareCount(stats?.statuses, 'outcome_unknown');
  return [
    { label: '요청 수', value: String(runs), sub: '모델 경유 ' + shareCount(stats?.paths, 'model') + '건' },
    { label: '평균 토큰', value: fmtInt(summary?.avg_total_tokens ?? 0), sub: '총 ' + fmtInt(totalTok) + ' 토큰' },
    { label: '총 비용', value: fmtCost(runs ? summary?.total_cost_usd : 0), sub: '요청당 ' + fmtCost(runs ? summary?.avg_cost_usd : 0) },
    { label: '도구 실패 비율', value: ((warn / n) * 100).toFixed(1) + '%', sub: warn + '건' },
    { label: '반영 미확인 비율', value: ((unknown / n) * 100).toFixed(1) + '%', sub: unknown + '건' },
  ];
}
