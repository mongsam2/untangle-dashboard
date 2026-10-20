import { describe, expect, it } from 'vitest';
import { ApiError } from '../errors';
import type { ChatResponse } from '../types';
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
    expect(blocked).toMatchObject({ kind: 'server', tool_name: 'set_reminder', error_code: 'conflict' });
    expect(t21.run.tool_calls).toBe(2);
  });
});

describe('서버 계약을 따르는 예시 데이터', () => {
  const byCase = (id: string) => MOCK_RUNS.find((d) => d.run.test_case_id === id)!;

  it('알림 도구는 set_schedule·set_reminder 이름과 target_type 인자를 쓴다', () => {
    const t34 = byCase('T34');
    const call = t34.steps.find((s) => s.tool_name === 'set_reminder')!;
    expect(call).toMatchObject({ kind: 'tool', tool_kind: 'mutation', status: 'failed' });
    expect(call.arguments).toEqual({ target_type: 'goal', target_id: 'g-1', base: 'start', minutes_before: 30 });
    const blocked = byCase('T21').steps.find((s) => s.decision === 'mutation_blocked')!;
    expect(blocked.arguments).toEqual({ target_type: 'goal', target_id: 'g-3', base: null, minutes_before: null });
    // 모델이 다음에 부르려던 도구도 새 이름이다.
    expect(byCase('T21').steps.filter((s) => s.kind === 'model').map((s) => s.next_action)).toContain('set_reminder');
    for (const d of MOCK_RUNS) {
      for (const s of d.steps) {
        expect(['set_goal_reminder', 'clear_goal_reminder']).not.toContain(s.tool_name);
        expect(['set_goal_reminder', 'clear_goal_reminder']).not.toContain(s.next_action);
      }
    }
  });

  it('응답에 사용자 변경 결과와 노트 상태가 실린다', () => {
    const t24 = byCase('T24').response as ChatResponse;
    expect(t24.mutation_results!.map((m) => m.status)).toEqual(['applied', 'unchanged']);
    expect(t24.note_states).toMatchObject([{ revision: 7, goal: { id: 'g-3', title: '토익 850점 받기' } }]);
    // 사용자가 직접 만든 과제는 역할이 없다.
    expect(t24.note_states![0]!.challenges!.find((c) => c.origin === 'user')).toMatchObject({ category: null, estimated_minutes: 120, start_time: '10:00' });
  });

  it('이전 대화는 서버가 만든 모양이다: 날짜 접두사, 버튼 턴, 끝나지 않은 턴', () => {
    for (const d of MOCK_RUNS) {
      for (const h of d.history.filter((x) => x.role === 'user')) expect(h.text).toMatch(/^\[\d{4}-\d{2}-\d{2}\] /);
      for (const h of d.history.filter((x) => x.role === 'assistant')) expect(h.text).not.toMatch(/^\[\d{4}-\d{2}-\d{2}\]/);
    }
    expect(byCase('T19').history[0]).toEqual({ role: 'user', text: '[2026-10-18] [제안 수락: 포트폴리오 공개]' });
    expect(byCase('T15').history.at(-1)!.role).toBe('user');
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
      cursor = page.next_cursor ?? null;
      pages++;
    } while (cursor);
    expect(pages).toBe(3);
    expect(new Set(seen).size).toBe(44);
  });

  it('조건이 바뀐 커서는 거절한다', () => {
    const cursor = encodeCursor(20, { source: 'test' });
    expect(() => h.listRuns({ source: 'real', cursor })).toThrow(ApiError);
    expect(() => h.listRuns({ cursor: 'not-base64!' })).toThrowError(expect.objectContaining({ status: 422, code: 'invalid_request' }));
  });

  it('범위를 벗어난 limit은 서버처럼 거절한다', () => {
    expect(() => h.listRuns({ limit: 101 })).toThrowError(expect.objectContaining({ status: 422 }));
    expect(() => h.listRuns({ limit: 0 })).toThrowError(expect.objectContaining({ status: 422 }));
  });

  it('요약 합계는 목록 전체를 더한 값과 같다', () => {
    const { summary, items } = h.listRuns({ limit: 100 });
    const total = (f: (r: (typeof items)[number]) => number) => items.reduce((a, r) => a + f(r), 0);
    expect(summary.total_input_tokens).toBe(total((r) => r.input_tokens));
    expect(summary.total_cached_tokens).toBe(total((r) => r.cached_tokens));
    expect(summary.total_model_calls).toBe(total((r) => r.model_calls));
    expect(summary.total_tokens).toBe(total((r) => r.input_tokens + r.output_tokens));
    expect(summary.max_duration_ms).toBe(Math.max(...items.map((r) => r.duration_ms)));
    expect(summary.model_runs + 8).toBe(summary.runs);
    expect(summary.tool_failed_runs + summary.outcome_unknown_runs + summary.error_runs).toBe(summary.attention_runs);
    const costs = items.flatMap((r) => (r.cost_usd === null ? [] : [r.cost_usd]));
    // 서버의 avg(cost_usd)처럼 비용이 없는 요청은 평균에서 뺀다.
    expect(summary.avg_cost_usd).toBeCloseTo(costs.reduce((a, c) => a + c, 0) / costs.length);
  });

  it('조건에 맞는 기록이 없으면 합계 0, 평균·최대 null', () => {
    const s = h.listRuns({ source: 'real', path: 'accept_direct' }).summary;
    expect(s).toMatchObject({ runs: 0, total_tokens: 0, max_duration_ms: null, avg_model_calls: null, total_cost_usd: null });
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
    expect(c.stats).toMatchObject({ runs: 4, outcome_unknown: 4, normal: 0, avg_model_calls: 4 });
    expect(c.stats.last_started_at).toBe(c.runs[0]!.started_at);
  });

  it('집계: 도구·비율·케이스', () => {
    const st = h.getStats({});
    // 서버처럼 모델을 부른 요청만 담는다(직행 8건 제외).
    expect(st.token_samples).toHaveLength(42);
    const search = st.tools.find((t) => t.tool_name === 'search_goals')!;
    // 케이스 7개 × 4회 + 실제 요청 4건 + 오류 요청 2건
    expect(search.calls).toBe(34);
    const reminder = st.tools.find((t) => t.tool_name === 'set_reminder')!;
    expect(reminder).toMatchObject({ calls: 4, failed: 4, unknown: 0 });
    expect(st.tools.find((t) => t.tool_name === 'set_schedule')).toMatchObject({ calls: 1, failed: 0, unknown: 0, tool_kind: 'mutation' });
    // 예전 도구 이름은 새 기록에 남지 않는다.
    expect(st.tools.some((t) => t.tool_name === 'set_goal_reminder' || t.tool_name === 'clear_goal_reminder')).toBe(false);
    expect(st.tools.find((t) => t.tool_name === 'set_completion')).toMatchObject({ calls: 8, unknown: 4 });
    expect(st.statuses.map((s) => s.value)).toEqual(['normal', 'tool_failed', 'outcome_unknown', 'error']);
    expect(st.statuses.reduce((a, s) => a + s.ratio, 0)).toBeCloseTo(1);
    expect(st.cases.map((c) => c.test_case_id)).toEqual(['T01', 'T03', 'T05', 'T10', 'T15', 'T18', 'T19', 'T20', 'T21', 'T24', 'T34']);
    expect(st.tool_kinds.find((k) => k.value === 'query')!.count).toBe(st.tools.filter((t) => t.tool_kind === 'query').reduce((a, t) => a + t.calls, 0));
  });

  it('집계는 필터를 따른다', () => {
    const st = h.getStats({ path: 'reject_direct' });
    expect(st.tools).toEqual([]);
    expect(st.paths).toEqual([{ value: 'reject_direct', count: 4, ratio: 1 }]);
  });
});
