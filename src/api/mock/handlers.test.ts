import { describe, expect, it } from 'vitest';
import { ApiError } from '../errors';
import type { RunStatus } from '../types';
import { CASE_IDS, MOCK_RUNS } from './fixtures';
import { createMockHandlers, encodeCursor } from './handlers';

const h = createMockHandlers();

describe('예시 데이터', () => {
  it('케이스 18개 × 3회와 실제 요청 7건이 있다', () => {
    expect(CASE_IDS).toHaveLength(19);
    expect(MOCK_RUNS.filter((d) => d.run.test_case_id !== null)).toHaveLength(57);
    expect(MOCK_RUNS.filter((d) => d.run.test_case_id === null)).toHaveLength(7);
  });

  it('상태 6종이 모두 등장한다', () => {
    const statuses = new Set(MOCK_RUNS.map((d) => d.run.status));
    for (const s of ['normal', 'tool_failed', 'blocked_input', 'limit_exceeded', 'output_rejected', 'error'] as RunStatus[]) expect(statuses.has(s)).toBe(true);
  });

  it('단계 번호는 1부터 이어지고 입력 차단 실행은 모델을 부르지 않는다', () => {
    for (const d of MOCK_RUNS) {
      d.steps.forEach((s, i) => expect(s.seq).toBe(i + 1));
      if (d.run.status === 'blocked_input') {
        expect(d.run.model_calls).toBe(0);
        expect(d.steps.some((s) => s.kind === 'guardrail' && s.passed === false)).toBe(true);
      }
    }
  });

  it('목록 항목의 집계는 단계와 맞는다', () => {
    for (const d of MOCK_RUNS) {
      const models = d.steps.filter((s) => s.kind === 'model');
      expect(d.run.model_calls).toBe(models.length);
      expect(d.run.tool_calls).toBe(d.steps.filter((s) => s.kind === 'tool').length);
      expect(d.run.input_tokens).toBe(models.reduce((a, s) => a + (s.input_tokens ?? 0), 0));
      expect(d.run.corrections).toBe(d.steps.filter((s) => s.decision === 'correction_requested').length);
      if (d.response && 'response_id' in d.response) {
        expect(d.run.ask_type).toBe(d.response.ask?.type ?? null);
        expect(d.run.proposal_count).toBe(d.response.ask?.proposals?.length ?? 0);
      }
    }
  });

  it('제안 카드는 한 응답에 최대 4개다', () => {
    for (const d of MOCK_RUNS) expect(d.run.proposal_count).toBeLessThanOrEqual(4);
    expect(MOCK_RUNS.some((d) => d.run.proposal_count === 4)).toBe(true);
  });
});

describe('listRuns', () => {
  it('최신순으로 돌려주고 summary는 필터 전체 기준이다', () => {
    const page = h.listRuns({ limit: 10 });
    expect(page.items).toHaveLength(10);
    expect(page.summary.runs).toBe(MOCK_RUNS.length);
    for (let i = 1; i < page.items.length; i += 1) expect(page.items[i - 1]!.started_at >= page.items[i]!.started_at).toBe(true);
  });

  it('커서로 이어서 받으면 전체를 빠짐없이 한 번씩 본다', () => {
    const seen = new Set<string>();
    let cursor: string | null = null;
    do {
      const page: ReturnType<typeof h.listRuns> = h.listRuns({ limit: 7, cursor });
      for (const r of page.items) seen.add(r.turn_id);
      cursor = page.next_cursor;
    } while (cursor);
    expect(seen.size).toBe(MOCK_RUNS.length);
  });

  it('필터가 다른 커서와 범위를 벗어난 limit은 422다', () => {
    const cursor = encodeCursor(7, { source: 'test' });
    expect(() => h.listRuns({ source: 'real', cursor })).toThrow(ApiError);
    expect(() => h.listRuns({ limit: 101 })).toThrow(ApiError);
    expect(() => h.listRuns({ limit: 0 })).toThrow(ApiError);
  });

  it('상태 필터는 그 상태만 센다', () => {
    const page = h.listRuns({ status: 'blocked_input', limit: 100 });
    expect(page.items.every((r) => r.status === 'blocked_input')).toBe(true);
    expect(page.summary.blocked_input_runs).toBe(page.summary.runs);
    expect(page.summary.model_runs).toBe(0);
  });
});

describe('sessions', () => {
  it('질문 → 답변 케이스는 같은 세션의 두 턴이다', () => {
    const c15 = MOCK_RUNS.find((d) => d.run.test_case_id === 'C15')!;
    const s = h.getSession(c15.run.session_id);
    expect(s.turns.map((t) => t.run.test_case_id)).toEqual(['C04', 'C15']);
    expect(s.session.turns).toBe(2);
    expect(s.turns[1]!.input.kind).toBe('answers');
    expect(s.omitted_turns).toBe(0);
  });

  it('세션 목록은 마지막 턴이 최근인 순서고 실제 요청만 거를 수 있다', () => {
    const all = h.listSessions({ limit: 100 });
    for (let i = 1; i < all.items.length; i += 1) expect(all.items[i - 1]!.last_started_at >= all.items[i]!.last_started_at).toBe(true);
    const real = h.listSessions({ source: 'real', limit: 100 });
    expect(real.items).toHaveLength(4);
    expect(real.items.every((s) => s.test_case_id === null)).toBe(true);
  });

  it('없는 세션은 404다', () => {
    expect(() => h.getSession('nope')).toThrow(ApiError);
  });
});

describe('cases·stats', () => {
  it('케이스 집계는 3회 실행 기준이다', () => {
    const c = h.getCase('C10');
    expect(c.stats.runs).toBe(3);
    expect(c.runs).toHaveLength(3);
    expect(c.runs.every((r) => r.corrections === 1)).toBe(true);
  });

  it('도구 12개 중 예시에 쓰인 도구가 종류와 함께 집계된다', () => {
    const st = h.getStats({});
    const names = st.tools.map((t) => t.tool_name);
    expect(names).toContain('search_items');
    expect(names).toContain('propose_move_todo_to_plan');
    expect(names).toContain('get_today_briefing');
    expect(st.tool_kinds.map((k) => k.value)).toEqual(['query', 'proposal', 'briefing']);
    expect(st.tools.find((t) => t.tool_name === 'search_items')!.failed).toBe(3);
  });

  it('가드레일 집계는 층별 검사·차단 건수를 준다', () => {
    const st = h.getStats({});
    const ownership = st.guardrails.find((g) => g.layer === 'input' && g.name === 'target_ownership')!;
    expect(ownership.blocked).toBe(3);
    expect(ownership.checks).toBeGreaterThan(ownership.blocked);
    expect(st.guardrails.find((g) => g.layer === 'limit')!.blocked).toBe(3);
    // 출력 검사는 실제 서버와 같은 다섯 이름이고, 카드 누락(C19)은 missing_cards에서 막힌다.
    const output = st.guardrails.filter((g) => g.layer === 'output').map((g) => g.name);
    expect(new Set(output)).toEqual(new Set(['structure', 'length', 'references', 'card_count', 'missing_cards']));
    expect(st.guardrails.find((g) => g.layer === 'output' && g.name === 'missing_cards')!.blocked).toBe(3);
  });

  it('token_samples는 모델을 부른 실행만 담는다', () => {
    const st = h.getStats({});
    expect(st.token_samples).toHaveLength(MOCK_RUNS.filter((d) => d.run.model_calls > 0).length);
    expect(st.token_samples.every((n) => n > 0)).toBe(true);
  });
});
