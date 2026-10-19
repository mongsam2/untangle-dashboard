import type { CaseDetailResponse } from '../../api/types';
import { fmtCost, fmtInt } from '../../lib/format';

export interface CaseMeta {
  label: string;
  value: string;
  alert?: boolean;
}

/** 케이스 인스펙터 머리의 수치. 평균은 서버가 케이스의 전체 실행으로 계산한 CaseStat 값이다. */
export function caseMeta({ stats }: CaseDetailResponse): CaseMeta[] {
  const meta: CaseMeta[] = [
    { label: '실행 횟수', value: stats.runs + '회' },
    { label: '평균 모델 호출', value: (stats.avg_model_calls ?? 0).toFixed(1) + '회' },
    { label: '평균 도구 호출', value: (stats.avg_tool_calls ?? 0).toFixed(1) + '회' },
    { label: '평균 토큰', value: fmtInt(stats.avg_total_tokens ?? 0) },
    { label: '평균 비용', value: fmtCost(stats.avg_cost_usd) },
    { label: '도구 실패', value: stats.tool_failed + '회', alert: stats.tool_failed > 0 },
    { label: '반영 미확인', value: stats.outcome_unknown + '회', alert: stats.outcome_unknown > 0 },
  ];
  // 응답 오류는 있을 때만 보인다.
  if (stats.error > 0) meta.push({ label: '응답 오류', value: stats.error + '회', alert: true });
  return meta;
}
