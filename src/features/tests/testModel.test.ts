import { describe, expect, it } from 'vitest';
import { planAttempts, SAMPLE_SET } from './sampleData';
import {
  bestIndex,
  bestPassRate,
  caseTags,
  casePassCounts,
  casePassRate,
  casesInRun,
  categoryRates,
  configSummaries,
  countLevel,
  coverage,
  estimate,
  failedCaseIds,
  frequentFailures,
  latestDoneRun,
  p90,
  rateLevel,
  restSummary,
  runLabel,
  runProgress,
  toCaseFilter,
  type Attempt,
  type TestCase,
  type TestRun,
} from './testModel';

const base: TestCase = {
  id: 'C031',
  message: '그거 다음 주로 미뤄줘',
  features: ['plan_update'],
  changes: 'one',
  target: 'existing',
  info: 'ask',
  previousMessages: 16,
  list: { todos: 14, plans: 9 },
  expected: '어떤 계획인지 되묻기',
  checks: [
    { text: '실행 상태가 정상', judge: 'code' },
    { text: '카드 없이 질문이 나옴', judge: 'code' },
    { text: '질문이 짧고 분명함', judge: 'grader' },
  ],
};
const first: TestCase = { ...base, id: 'C001', features: ['plan_create', 'move'], changes: 'one', target: 'new', info: 'in_message', previousMessages: 0, list: { todos: 0, plans: 0 } };

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
    checks: [true, passed, true],
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
    { model: 'GPT-6 Luna', effort: 'low' },
    { model: 'GPT-6 Luna', effort: 'medium' },
  ],
  repeats: 2,
  caseIds: ['C001', 'C031'],
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
  it('나머지 카테고리는 기능을 빼고 짧은 이름으로 잇는다', () => {
    expect(restSummary(base)).toBe('항목 1개 · 기존 · 물어봐야 함 · 목록 21+ · 아주 김');
    expect(restSummary(first)).toBe('항목 1개 · 새 · 메시지에 있음 · 목록 0 · 첫 턴');
  });

  it('케이스 결과 꼬리표는 기능을 회색으로 먼저 두고 대화 위치에 메시지 수를 붙인다', () => {
    expect(caseTags(base)).toEqual([
      { text: '계획 수정', tone: 'neutral' },
      { text: '항목 1개', tone: 'info' },
      { text: '기존 항목', tone: 'info' },
      { text: '물어봐야 함', tone: 'info' },
      { text: '목록 21+', tone: 'info' },
      { text: '아주 김 (16)', tone: 'info' },
    ]);
    expect(caseTags(first).at(-1)).toEqual({ text: '첫 턴', tone: 'info' });
  });

  it('카테고리별 케이스 수는 빈 값도 남기고, 가장 많은 값을 막대 끝으로 둔다', () => {
    const groups = coverage([base, first]);
    const feature = groups.find((g) => g.key === 'feature')!;
    expect(feature.title).toBe('기능 (여러 개 선택)');
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
      { id: 'in_message', label: '메시지에 있음', count: 1, rates: [1, 1] },
      { id: 'ask', label: '물어봐야 함', count: 1, rates: [0, 0.5] },
    ]);
  });

  it('자주 틀린 체크 항목은 같은 문장을 설정별로 센다', () => {
    expect(frequentFailures(run, [base, first])).toEqual([{ text: '카드 없이 질문이 나옴', judge: 'code', counts: [2, 1] }]);
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
});

describe('예시 데이터', () => {
  it('케이스 ID가 겹치지 않고 모든 값이 카테고리에 있다', () => {
    const ids = SAMPLE_SET.cases.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of SAMPLE_SET.cases) expect(caseTags(c).every((t) => t.text && !t.text.includes('undefined'))).toBe(true);
  });

  it('예시 실행은 같은 씨앗이면 같은 결과이고, 시도 수가 케이스 × 설정 × 반복이다', () => {
    const configs = [
      { model: 'GPT-6 Luna', effort: 'low' as const },
      { model: 'GPT-6 Luna', effort: 'medium' as const },
    ];
    const ids = SAMPLE_SET.cases.map((c) => c.id);
    const a = planAttempts(7, configs, 3, ids, 0, 1000, []);
    expect(a).toHaveLength(ids.length * 2 * 3);
    expect(planAttempts(7, configs, 3, ids, 0, 1000, [])).toEqual(a);
    for (const x of a) {
      const c = SAMPLE_SET.cases.find((k) => k.id === x.caseId)!;
      expect(x.checks).toHaveLength(c.checks.length);
      // 통과한 시도는 모든 체크를 지키고, 실패한 시도는 하나 이상 틀린다.
      expect(x.checks.every(Boolean)).toBe(x.passed);
      expect(x.quality === null).toBe(!x.passed);
    }
  });
});
