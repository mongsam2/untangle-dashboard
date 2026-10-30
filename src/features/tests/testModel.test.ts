import { describe, expect, it } from 'vitest';
import { planAttempts } from './sampleData';
import {
  bestIndex,
  bestPassRate,
  CATEGORIES,
  caseTagGroups,
  casePassCounts,
  casePassRate,
  casesInRun,
  caseValues,
  categoryRates,
  configShort,
  configSummaries,
  countLevel,
  coverage,
  DEFAULT_GRADER,
  estimate,
  estimateFromRun,
  failedCaseIds,
  fromServerRun,
  frequentFailures,
  latestDoneRun,
  listText,
  memoryText,
  p90,
  previousText,
  rateLevel,
  restSummary,
  runLabel,
  runProgress,
  toCaseFilter,
  valueOf,
  type Attempt,
  type CategoryKey,
  type CheckResult,
  type TestCase,
  type TestRun,
} from './testModel';
import { CASE_FILE, TEST_SET } from './testSet';

const base: TestCase = {
  id: 'C031',
  message: '그거 다음 주로 미뤄줘',
  features: ['plan_update'],
  changes: 'one',
  target: 'existing',
  info: 'ask',
  memory: 'none',
  previousMessages: 16,
  list: { todos: 14, plans: 9 },
  expected: '어떤 계획인지 되묻기',
  checks: [
    { text: '실행 상태가 정상', judge: 'code' },
    { text: '카드 없이 질문이 나옴', judge: 'code' },
    { text: '질문이 짧고 분명함', judge: 'grader' },
  ],
  setup: { list: '큰 목록', memory: '빈 기억', memoryLines: 0, conversation: '긴 대화', tailChanged: true },
};
const first: TestCase = { ...base, id: 'C001', features: ['plan_create', 'move'], changes: 'one', target: 'new', info: 'in_message', previousMessages: 0, list: { todos: 0, plans: 0 }, setup: { ...base.setup, conversation: null, tailChanged: false } };

const ok: CheckResult = { passed: true, judgedBy: 'code', reason: null };
const wrong: CheckResult = { passed: false, judgedBy: 'code', reason: '질문 없음' };

function attempt(caseId: string, config: number, repeat: number, passed: boolean, extra: Partial<Attempt> = {}): Attempt {
  return {
    caseId,
    config,
    repeat,
    finishedAt: '2026-10-27T06:00:00Z',
    passed,
    quality: passed ? 2 : null,
    latencyMs: 4000,
    costUsd: 0.01,
    graderCostUsd: passed ? 0.03 : null,
    checks: [ok, passed ? ok : wrong, ok],
    reason: '',
    reply: '',
    turnId: null,
    ...extra,
  };
}

const run: TestRun = {
  id: 'run-1',
  startedAt: '2026-10-27T05:20:00Z',
  updatedAt: '2026-10-27T05:28:00Z',
  status: 'done',
  configs: [
    { model: 'gpt-6-luna', effort: 'low' },
    { model: 'gpt-6-luna', effort: 'medium' },
  ],
  repeats: 2,
  caseIds: ['C001', 'C031'],
  grader: DEFAULT_GRADER,
  attempts: [
    attempt('C001', 0, 1, true, { latencyMs: 3000, quality: 3 }),
    attempt('C001', 1, 1, true, { latencyMs: 6000 }),
    attempt('C031', 0, 1, false, { latencyMs: 5000 }),
    attempt('C031', 1, 1, true, { latencyMs: 7000, costUsd: 0.02 }),
    attempt('C001', 0, 2, true, { latencyMs: 2000, quality: 3 }),
    attempt('C001', 1, 2, true, { latencyMs: 6500 }),
    attempt('C031', 0, 2, false, { latencyMs: 4500 }),
    attempt('C031', 1, 2, false, { latencyMs: 8000 }),
  ],
};

describe('케이스 표시', () => {
  it('나머지 카테고리는 사용자 요청을 빼고 짧은 이름으로 잇는다', () => {
    expect(restSummary(base)).toBe('되물어야 함 · 1개 바꿈 · 있던 걸 고침 · 목록 21개 이상 · 대화 15번 이상');
    expect(restSummary(first)).toBe('말에 다 있음 · 1개 바꿈 · 새로 만듦 · 목록 0개 · 앞선 대화 없음');
  });

  it('케이스 결과 꼬리표는 카테고리 이름 아래에 긴 이름으로 두고 앞선 대화는 메시지 수로 보인다', () => {
    expect(caseTagGroups(base)).toEqual([
      { title: '사용자 요청', tone: 'neutral', values: ['계획 고치기'] },
      { title: '필요한 정보', tone: 'info', values: ['되물어야 함'] },
      { title: '바꾸는 할 일·계획 수', tone: 'info', values: ['1개'] },
      { title: '새로 만드나 고치나', tone: 'info', values: ['있던 걸 고침'] },
      { title: '미리 넣어 둔 할 일·계획', tone: 'info', values: ['21개 이상'] },
      { title: '앞선 대화', tone: 'info', values: ['16번 주고받음'] },
    ]);
    expect(caseTagGroups(first).at(-1)).toEqual({ title: '앞선 대화', tone: 'info', values: ['없음'] });
  });

  it('기억 카테고리는 기억이 걸린 케이스에만 붙인다', () => {
    const remembers: TestCase = { ...first, memory: 'apply' };
    expect(restSummary(remembers)).toBe('말에 다 있음 · 1개 바꿈 · 새로 만듦 · 목록 0개 · 앞선 대화 없음 · 기억대로 답하기');
    expect(caseTagGroups(remembers).at(-1)).toEqual({ title: '기억 다루기', tone: 'info', values: ['기억대로 답하기'] });
    expect(caseTagGroups(first).some((g) => g.title === '기억 다루기')).toBe(false);
  });

  it('케이스 결과의 준비 상태는 준비 묶음 이름과 크기를 함께 보인다', () => {
    expect(previousText(base)).toBe('긴 대화 · 사용자 메시지 16개 · 끝부분 바꿈');
    expect(previousText(first)).toBe('없음');
    expect(listText(base)).toBe('큰 목록 · 할 일 14 · 계획 9');
    expect(listText(first)).toBe('없음');
    expect(memoryText(base)).toBe('없음');
    expect(memoryText({ ...base, setup: { ...base.setup, memory: '전체 기억', memoryLines: 6 } })).toBe('전체 기억 · 6줄');
  });

  it('카테고리별 케이스 수는 빈 값도 남기고, 가장 많은 값을 막대 끝으로 둔다', () => {
    const groups = coverage([base, first]);
    const feature = groups.find((g) => g.key === 'feature')!;
    expect(feature.title).toBe('사용자 요청 (여러 개 선택)');
    expect(feature.rows.find((r) => r.id === 'move')).toMatchObject({ count: 1, ratio: 0.5 });
    expect(feature.rows.find((r) => r.id === 'query')).toMatchObject({ count: 0, ratio: 0 });
    expect(groups.find((g) => g.key === 'changes')!.rows.find((r) => r.id === 'one')).toMatchObject({ count: 2, ratio: 1 });
  });
});

describe('실행 결과', () => {
  it('설정별 요약은 끝난 시도로 통과율·품질·응답·비용을 낸다', () => {
    const [a, b] = configSummaries(run);
    expect(a).toMatchObject({ passRate: 0.5, quality: 3, avgLatencyMs: 3625, p90LatencyMs: 5000 });
    expect(a!.costUsd).toBeCloseTo(0.04);
    expect(b).toMatchObject({ passRate: 0.75, quality: 2, p90LatencyMs: 8000 });
    expect(b!.costUsd).toBeCloseTo(0.05);
  });

  it('단가를 모르는 시도의 비용은 빼고 더하고, 모두 모르면 비어 있다', () => {
    const unknown: TestRun = { ...run, attempts: run.attempts.map((a) => (a.config === 1 ? { ...a, costUsd: null } : a)) };
    const [a, b] = configSummaries(unknown);
    expect(a!.costUsd).toBeCloseTo(0.04);
    expect(b).toMatchObject({ costUsd: null, costPerAttempt: null });
    expect(runProgress(unknown).costUsd).toBeCloseTo(0.04);
    expect(runProgress(run).graderCostUsd).toBeCloseTo(0.15);
  });

  it('칸마다 더 나은 설정을 고른다. 같으면 고르지 않는다', () => {
    const summaries = configSummaries(run);
    expect(bestIndex(summaries, 'passRate')).toBe(1);
    expect(bestIndex(summaries, 'quality')).toBe(0);
    expect(bestIndex(summaries, 'avgLatencyMs')).toBe(0);
    expect(bestIndex(summaries, 'costUsd')).toBe(0);
    expect(bestIndex([summaries[0]!, summaries[0]!], 'passRate')).toBeNull();
    expect(bestIndex([summaries[0]!], 'passRate')).toBeNull();
  });

  it('카테고리 값별 통과율은 이 실행에 그 값의 케이스가 있을 때만 줄을 둔다', () => {
    const groups = categoryRates(run, [base, first]);
    const info = groups.find((g) => g.key === 'info')!;
    expect(info.rows).toEqual([
      { id: 'in_message', label: '말에 다 있음', count: 1, rates: [1, 1] },
      { id: 'ask', label: '되물어야 함', count: 1, rates: [0, 0.5] },
    ]);
  });

  it('자주 틀린 체크 항목은 같은 문장을 설정별로 센다', () => {
    expect(frequentFailures(run, [base, first])).toEqual([{ text: '카드 없이 질문이 나옴', judge: 'code', counts: [2, 1] }]);
  });

  it('자주 틀린 체크 항목은 실제로 판정한 쪽을 보이고, 판정하지 않은 항목은 세지 않는다', () => {
    const unjudged: CheckResult = { passed: null, judgedBy: null, reason: null };
    const byGrader: CheckResult = { passed: false, judgedBy: 'grader', reason: '날짜를 지어냄' };
    const graded: TestRun = { ...run, attempts: [attempt('C031', 0, 1, false, { checks: [ok, byGrader, unjudged] })] };
    expect(frequentFailures(graded, [base])).toEqual([{ text: '카드 없이 질문이 나옴', judge: 'grader', counts: [1, 0] }]);
  });

  it('케이스 반복 통과 수와 통과율', () => {
    expect(casePassCounts(run, 'C031')).toEqual([
      { passed: 0, total: 2 },
      { passed: 1, total: 2 },
    ]);
    expect(casePassRate(run, 'C031')).toBe(0.25);
    expect(casePassRate(null, 'C031')).toBeNull();
    expect(bestPassRate(run)).toBe(0.75);
    expect(failedCaseIds(run)).toEqual(['C031']);
  });

  it('진행은 끝난 시도 수와 지금까지의 속도로 남은 시간을 어림한다', () => {
    const half: TestRun = { ...run, status: 'running', attempts: run.attempts.slice(0, 4) };
    expect(runProgress(half)).toMatchObject({ done: 4, total: 8, ratio: 0.5, elapsedMs: 8 * 60000, remainingMs: 8 * 60000 });
    expect(runProgress({ ...half, attempts: [] }).remainingMs).toBeNull();
  });

  it('설정 칩은 모델 ID를 화면 이름의 끝 단어로 줄인다', () => {
    expect(configShort({ model: 'gpt-6-luna', effort: 'low' })).toBe('Luna · low');
    expect(configShort({ model: 'gpt-7', effort: 'high' })).toBe('gpt-7 · high');
  });

  it('탱글 서버 응답을 화면 모양으로 바꾼다. 목록 응답에는 시도가 없다', () => {
    const summary = {
      id: '0b5c1d3e-8f2a-4c1b-9d7e-6a5b4c3d2e1f',
      status: 'running' as const,
      started_at: '2026-10-30T05:00:00Z',
      updated_at: '2026-10-30T05:03:00Z',
      finished_at: null,
      configs: [{ model: 'gpt-6-luna', effort: 'low' }],
      repeats: 1,
      case_ids: ['C031'],
      grader: { model: 'claude-opus-5-5', effort: 'medium' },
      done: 1,
      total: 1,
    };
    expect(fromServerRun(summary)).toMatchObject({ id: summary.id, startedAt: summary.started_at, caseIds: ['C031'], grader: summary.grader, attempts: [] });
    const detail = fromServerRun({
      ...summary,
      attempts: [
        {
          case_id: 'C031',
          config: 0,
          repeat: 1,
          finished_at: '2026-10-30T05:02:00Z',
          passed: false,
          quality: null,
          latency_ms: 4100,
          model_calls: 2,
          tool_calls: 1,
          cost_usd: null,
          checks: [{ passed: false, judged_by: 'grader', reason: '날짜를 지어냄' }],
          reason: '질문이 짧고 분명함: 날짜를 지어냄',
          reply: '언제로 옮길까?',
          turn_id: null,
          grader_model: 'claude-opus-5-5',
          grader_cost_usd: 0.031,
        },
      ],
    });
    expect(detail.attempts).toEqual([
      {
        caseId: 'C031',
        config: 0,
        repeat: 1,
        finishedAt: '2026-10-30T05:02:00Z',
        passed: false,
        quality: null,
        latencyMs: 4100,
        costUsd: null,
        graderCostUsd: 0.031,
        checks: [{ passed: false, judgedBy: 'grader', reason: '날짜를 지어냄' }],
        reason: '질문이 짧고 분명함: 날짜를 지어냄',
        reply: '언제로 옮길까?',
        turnId: null,
      },
    ]);
  });

  it('실행 이름은 한국 시간 시작 시각이다', () => {
    expect(runLabel(run)).toBe('10/27 14:20 실행');
  });

  it('최근 끝난 실행은 진행 중·중단된 실행을 건너뛴다', () => {
    const later: TestRun = { ...run, id: 'run-2', startedAt: '2026-10-27T06:00:00Z', status: 'running' };
    expect(latestDoneRun([later, run])?.id).toBe('run-1');
    expect(latestDoneRun([later])).toBeNull();
  });

  it('카테고리 필터는 있는 값만 받고, 그 값의 케이스를 ID 순으로 준다', () => {
    expect(toCaseFilter({ key: 'info', value: 'ask' })).toEqual({ key: 'info', value: 'ask' });
    expect(toCaseFilter({ key: 'info', value: 'nope' })).toBeNull();
    expect(toCaseFilter({ key: 'memory', value: 'ask' })).toBeNull();
    expect(casesInRun(run, [base, first], null).map((c) => c.id)).toEqual(['C001', 'C031']);
    expect(casesInRun(run, [base, first], { key: 'feature', value: 'move' }).map((c) => c.id)).toEqual(['C001']);
  });
});

describe('색과 어림', () => {
  it('통과율 칸: 85% 이상 초록, 70~84% 노랑, 그 아래 빨강', () => {
    expect([0.85, 0.849, 0.7, 0.69, null].map(rateLevel)).toEqual(['good', 'good', 'mid', 'bad', 'empty']);
  });

  it('반복 통과 수 칸: 전부 초록, 절반 넘게 노랑, 그 밖 빨강', () => {
    expect([3, 2, 1, 0].map((passed) => countLevel({ passed, total: 3 }))).toEqual(['good', 'mid', 'bad', 'bad']);
    expect(countLevel({ passed: 0, total: 0 })).toBe('empty');
  });

  it('느린 10%는 가장 가까운 순위의 90번째 값이다', () => {
    expect(p90([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(9);
    expect(p90([5])).toBe(5);
    expect(p90([])).toBeNull();
  });

  it('새 실행 어림: 시도마다 탱글과 채점을 한 번씩 부른다', () => {
    const est = estimate([{ costUsd: 0.01, latencyMs: 4000 }, { costUsd: 0.02, latencyMs: 6000 }], { costUsd: 0.005, latencyMs: 2000 }, 10, 3, 4);
    expect(est.calls).toBe(60);
    expect(est.costUsd).toBeCloseTo(30 * 0.015 + 30 * 0.025);
    expect(est.durationMs).toBe((30 * 6000 + 30 * 8000) / 4);
  });

  it('지난 실행으로 어림: 같은 설정의 시도당 탱글·채점 비용과 시도 하나에 걸린 간격을 쓴다', () => {
    const luna = run.configs[1]!;
    const est = estimateFromRun(run, [luna], 10, 3);
    expect(est.calls).toBe(30);
    // 설정 B: 시도 4개의 탱글 비용 0.05, 채점 비용 0.03 × 통과 3번
    expect(est.costUsd).toBeCloseTo(30 * ((0.05 + 0.09) / 4));
    expect(est.durationMs).toBe(((8 * 60000) / 8) * 30);
    expect(estimateFromRun(run, [luna, { model: 'gpt-6-sol', effort: 'low' }], 10, 3)).toMatchObject({ calls: 60, costUsd: null });
    expect(estimateFromRun(null, [luna], 10, 3)).toEqual({ calls: 30, costUsd: null, durationMs: null });
  });
});

describe('케이스 파일', () => {
  const cases = TEST_SET.cases;
  const count = (key: CategoryKey) => Object.fromEntries(coverage(cases).find((g) => g.key === key)!.rows.map((r) => [r.id, r.count]));

  it('설계 문서의 케이스 84개를 겹치지 않는 ID로 담는다', () => {
    const ids = cases.map((c) => c.id);
    expect(ids).toHaveLength(84);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('케이스가 가리키는 목록·항목·기억·이전 대화가 파일에 있다', () => {
    for (const c of CASE_FILE.cases) {
      const list = CASE_FILE.lists[c.list];
      expect(list, c.id).toBeDefined();
      for (const key of list!.items) expect(CASE_FILE.items[key], `${c.id} ${key}`).toBeDefined();
      expect(CASE_FILE.memories[c.startMemory], c.id).toBeDefined();
      if (c.conversation) expect(CASE_FILE.conversations[c.conversation], c.id).toBeDefined();
      for (const t of c.conversationTail ?? []) expect(t.turn).toBeLessThanOrEqual(CASE_FILE.conversations[c.conversation!]!.turns);
    }
    for (const conv of Object.values(CASE_FILE.conversations)) expect(conv.turns).toBeLessThanOrEqual(CASE_FILE.script.length);
  });

  it('모든 값이 카테고리에 있고, 케이스마다 실행 상태 체크가 있다', () => {
    for (const c of cases) {
      for (const cat of CATEGORIES) for (const value of caseValues(c, cat.key)) expect(valueOf(cat.key, value), `${c.id} ${cat.key}`).toBeDefined();
      expect(c.checks.some((k) => k.text === '실행 상태 정상' && k.judge === 'code'), c.id).toBe(true);
    }
  });

  it('카테고리별 케이스 수가 설계 문서와 같다', () => {
    expect(count('changes')).toEqual({ none: 23, one: 43, few: 13, many: 5 });
    expect(count('target')).toEqual({ existing: 38, new: 17, both: 6, none: 23 });
    expect(count('info')).toEqual({ in_message: 57, from_context: 13, ask: 14 });
    expect(count('list')).toEqual({ empty: 9, small: 35, medium: 30, large: 10 });
    expect(count('position')).toEqual({ first: 56, short: 11, long: 10, very_long: 7 });
    expect(count('memory')).toEqual({ none: 64, apply: 6, update: 7, keep: 5, show: 2 });
    expect(count('feature')).toMatchObject({ todo_split: 11, plan_split: 7, memory_only: 11 });
  });

  it('예시 실행은 같은 씨앗이면 같은 결과이고, 시도 수가 케이스 × 설정 × 반복이다', () => {
    const configs = [
      { model: 'gpt-6-luna', effort: 'low' as const },
      { model: 'gpt-6-luna', effort: 'medium' as const },
    ];
    const ids = cases.map((c) => c.id);
    const a = planAttempts(7, cases, configs, 3, ids, 0, 1000, []);
    expect(a).toHaveLength(ids.length * 2 * 3);
    expect(planAttempts(7, cases, configs, 3, ids, 0, 1000, [])).toEqual(a);
    expect(a.some((x) => !x.passed)).toBe(true);
    for (const x of a) {
      const c = cases.find((k) => k.id === x.caseId)!;
      expect(x.checks).toHaveLength(c.checks.length);
      // 통과한 시도는 모든 체크를 지키고, 실패한 시도는 실행 상태 말고 다른 체크를 하나 이상 틀린다.
      expect(x.checks.every((k) => k.passed === true)).toBe(x.passed);
      expect(x.checks.some((k) => k.passed === false)).toBe(!x.passed);
      expect(x.checks[c.checks.findIndex((k) => k.text === '실행 상태 정상')]?.passed).toBe(true);
      expect(x.quality === null).toBe(!x.passed);
      // 코드 판정에서 틀려도 채점 모델이 모든 항목을 판정하고, 틀린 항목에만 이유가 있다.
      expect(x.graderCostUsd).not.toBeNull();
      expect(x.checks.every((k) => (k.passed === false) === (k.reason !== null))).toBe(true);
    }
  });
});
