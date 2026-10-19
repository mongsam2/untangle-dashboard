import { describe, expect, it } from 'vitest';
import { ApiError } from '../errors';
import { MOCK_RUNS } from './fixtures';
import { createMockHandlers, encodeCursor } from './handlers';

const h = createMockHandlers();

describe('예시 데이터', () => {
  it('케이스 44건 + 실제 요청 4건 + 응답 오류 2건', () => {
    expect(MOCK_RUNS).toHaveLength(50);
    expect(MOCK_RUNS.filter((d) => d.run.test_case_id)).toHaveLength(44);
    expect(MOCK_RUNS.filter((d) => d.run.status === 'error')).toHaveLength(2);
    expect(new Set(MOCK_RUNS.map((d) => d.run.request_id)).size).toBe(50);
  });

  it('합계는 모델 단계에서 계산한 값과 같다', () => {
    for (const d of MOCK_RUNS) {
      const models = d.steps.filter((s) => s.kind === 'model');
      expect(d.run.model_calls).toBe(models.length);
      expect(d.run.input_tokens).toBe(models.reduce((a, s) => a + (s.input_tokens ?? 0), 0));
      expect(d.run.cached_tokens).toBeLessThanOrEqual(d.run.input_tokens);
      expect(d.run.reasoning_tokens).toBeLessThanOrEqual(d.run.output_tokens);
      expect(d.run.path === 'model' || d.run.model_calls === 0).toBe(true);
      expect(d.run.path === 'model' || d.run.model === null).toBe(true);
      d.steps.forEach((s, i) => expect(s.seq).toBe(i + 1));
    }
  });

  it('프로토타입 첫 실행(T10 1회차)의 수치를 그대로 옮긴다', () => {
    const t10 = MOCK_RUNS.find((d) => d.run.test_case_id === 'T10')!;
    expect(t10.run.started_at).toBe('2026-10-19T08:52:13.000Z');
    expect(t10.run.input_tokens).toBe(33800);
    expect(t10.run.cached_tokens).toBe(29300);
    expect(t10.run.duration_ms).toBe(1900 + 40 + 1600 + 55 + 4300 + 120 + 1700 + 110);
  });

  it('입력 앞부분: 버튼 입력은 고정 문구', () => {
    const t20 = MOCK_RUNS.find((d) => d.run.test_case_id === 'T20')!;
    expect(t20.run.input_preview).toBe('제안 수락');
    expect(MOCK_RUNS.find((d) => d.run.test_case_id === 'T18')!.run.input_preview).toBe('제안 거절');
  });

  it('도구 실패로 답변을 대체한 요청은 message_replaced', () => {
    const t34 = MOCK_RUNS.find((d) => d.run.test_case_id === 'T34')!;
    expect(t34.run.message_replaced).toBe(true);
    const t21 = MOCK_RUNS.find((d) => d.run.test_case_id === 'T21')!;
    const blocked = t21.steps.find((s) => s.decision === 'mutation_blocked')!;
    expect(blocked).toMatchObject({ kind: 'server', tool_name: 'clear_goal_reminder', error_code: 'conflict' });
    expect(t21.run.tool_calls).toBe(2);
  });
});

describe('목록 API 흉내', () => {
  it('최신순, 필터, 요약', () => {
    const all = h.listRuns({ limit: 100 });
    expect(all.items).toHaveLength(50);
    expect(all.next_cursor).toBeNull();
    const times = all.items.map((r) => r.started_at);
    expect([...times].sort().reverse()).toEqual(times);
    expect(all.summary).toMatchObject({ runs: 50, test_runs: 44, real_runs: 6 });

    const real = h.listRuns({ source: 'real', limit: 100 });
    expect(real.items.every((r) => r.test_case_id === null)).toBe(true);
    expect(real.summary.runs).toBe(6);

    const unk = h.listRuns({ status: 'outcome_unknown' });
    expect(unk.summary.runs).toBe(4);
    expect(unk.summary.attention_runs).toBe(4);

    expect(h.listRuns({ path: 'accept_direct' }).summary.runs).toBe(4);
  });

  it('커서 페이지는 겹치지 않고 끝까지 이어진다', () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = h.listRuns({ source: 'test', limit: 20, cursor });
      seen.push(...page.items.map((r) => r.request_id));
      cursor = page.next_cursor;
      pages++;
    } while (cursor);
    expect(pages).toBe(3);
    expect(new Set(seen).size).toBe(44);
  });

  it('조건이 바뀐 커서는 거절한다', () => {
    const cursor = encodeCursor(20, { source: 'test' });
    expect(() => h.listRuns({ source: 'real', cursor })).toThrow(ApiError);
    expect(() => h.listRuns({ cursor: 'not-base64!' })).toThrow(ApiError);
  });
});

describe('상세·케이스·집계 흉내', () => {
  it('없는 ID는 404', () => {
    expect(() => h.getRun('nope')).toThrowError(expect.objectContaining({ status: 404 }));
    expect(() => h.getCase('T99')).toThrowError(expect.objectContaining({ status: 404 }));
  });

  it('케이스는 실행 4건과 상태별 건수', () => {
    const c = h.getCase('T21');
    expect(c.runs).toHaveLength(4);
    expect(c.stats).toMatchObject({ runs: 4, outcome_unknown: 4, normal: 0 });
    expect(c.stats.last_started_at).toBe(c.runs[0]!.started_at);
  });

  it('집계: 도구·비율·케이스', () => {
    const st = h.getStats({});
    expect(st.token_samples).toHaveLength(50);
    const search = st.tools.find((t) => t.tool_name === 'search_goals')!;
    // 케이스 7개 × 4회 + 실제 요청 4건 + 오류 요청 2건
    expect(search.calls).toBe(34);
    const reminder = st.tools.find((t) => t.tool_name === 'set_goal_reminder')!;
    expect(reminder).toMatchObject({ calls: 4, failed: 4, unknown: 0 });
    expect(st.tools.find((t) => t.tool_name === 'set_completion')).toMatchObject({ calls: 8, unknown: 4 });
    expect(st.statuses.map((s) => s.value)).toEqual(['normal', 'tool_failed', 'outcome_unknown', 'error']);
    expect(st.statuses.reduce((a, s) => a + s.ratio, 0)).toBeCloseTo(1);
    expect(st.cases.map((c) => c.test_case_id)).toEqual(['T10', 'T20', 'T18', 'T24', 'T05', 'T03', 'T34', 'T21', 'T15', 'T01', 'T19']);
    expect(st.tool_kinds.find((k) => k.value === 'query')!.count).toBe(st.tools.filter((t) => t.tool_kind === 'query').reduce((a, t) => a + t.calls, 0));
  });

  it('집계는 필터를 따른다', () => {
    const st = h.getStats({ path: 'reject_direct' });
    expect(st.tools).toEqual([]);
    expect(st.paths).toEqual([{ value: 'reject_direct', count: 4, ratio: 1 }]);
  });
});
