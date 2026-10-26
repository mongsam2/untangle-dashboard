import { describe, expect, it } from 'vitest';
import type { RunSummaryStats } from '../../api/types';
import { listTiles } from './kpi';

const summary: RunSummaryStats = {
  runs: 50,
  test_runs: 40,
  real_runs: 10,
  normal_runs: 40,
  tool_failed_runs: 4,
  blocked_input_runs: 2,
  limit_exceeded_runs: 1,
  output_rejected_runs: 2,
  error_runs: 1,
  model_runs: 48,
  total_model_calls: 130,
  avg_model_calls: 2.6,
  total_tool_calls: 90,
  avg_tool_calls: 1.8,
  total_corrections: 3,
  total_tokens: 1182423,
  avg_total_tokens: 23648.46,
  total_input_tokens: 1000000,
  total_cached_tokens: 700000,
  total_output_tokens: 182423,
  total_reasoning_tokens: 90000,
  total_cost_usd: 0.8506,
  avg_cost_usd: 0.017012,
  avg_duration_ms: 7200,
  max_duration_ms: 42700,
};

describe('listTiles', () => {
  it('서버 요약값으로 여섯 칸을 채운다', () => {
    const tiles = listTiles(summary);
    expect(tiles.map((t) => t.value)).toEqual(['50', '23,648', '$0.8506', '8.0%', '8.0%', '4.0%']);
    expect(tiles[4]!.sub).toBe('입력 차단 2 · 출력 거부 2');
  });

  it('요약이 없으면 0으로 보인다', () => {
    expect(listTiles(undefined)[3]!.value).toBe('0.0%');
  });
});
