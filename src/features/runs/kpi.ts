import type { RunSummaryStats } from '../../api/types';
import type { KpiTile } from '../../components/Page';
import { fmtCost, fmtInt, fmtPct } from '../../lib/format';

/** 요청 목록 KPI. 모든 수치는 서버 요약값(필터 조건 전체)이다. */
export function listTiles(s: RunSummaryStats | undefined): KpiTile[] {
  const runs = s?.runs ?? 0;
  const ratio = (n: number) => (runs ? fmtPct(n / runs) : '0.0%');
  const guard = (s?.blocked_input_runs ?? 0) + (s?.output_rejected_runs ?? 0);
  const limitErr = (s?.limit_exceeded_runs ?? 0) + (s?.error_runs ?? 0);
  return [
    { label: '요청 수', value: fmtInt(runs), sub: '모델 경유 ' + fmtInt(s?.model_runs ?? 0) + '건' },
    { label: '평균 토큰', value: fmtInt(s?.avg_total_tokens ?? 0), sub: '총 ' + fmtInt(s?.total_tokens ?? 0) + ' 토큰' },
    { label: '총 비용', value: fmtCost(s?.total_cost_usd ?? 0), sub: '요청당 ' + fmtCost(s?.avg_cost_usd ?? 0) },
    { label: '도구 실패 비율', value: ratio(s?.tool_failed_runs ?? 0), sub: (s?.tool_failed_runs ?? 0) + '건' },
    { label: '가드레일 차단 비율', value: ratio(guard), sub: '입력 차단 ' + (s?.blocked_input_runs ?? 0) + ' · 출력 거부 ' + (s?.output_rejected_runs ?? 0) },
    { label: '한도 초과 · 서버 오류', value: ratio(limitErr), sub: '한도 ' + (s?.limit_exceeded_runs ?? 0) + ' · 오류 ' + (s?.error_runs ?? 0) },
  ];
}
