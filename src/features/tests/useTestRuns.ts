import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { apiMode } from '../../api/client';
import { MOCK_RUNS } from '../../api/mock/fixtures';
import { JUDGE_COST, PARALLEL, attemptCost, planAttempts, type PlannedAttempt } from './sampleData';
import { estimate, type RunStatus, type TestConfig, type TestRun } from './testModel';
import { TEST_SET } from './testSet';

// 예시 실행 저장소. 탱글 서버에 테스트 실행 기능이 생기기 전까지 화면이 이 실행을 본다.
// 진행 중인 실행은 시각에 맞춰 시도가 하나씩 끝나고, 새 실행도 같은 방식으로 돌아간다. 새로고침하면 처음으로 돌아간다.

interface PlannedRun {
  id: string;
  startedAt: number;
  stoppedAt: number | null;
  configs: TestConfig[];
  repeats: number;
  caseIds: string[];
  attempts: PlannedAttempt[];
}

const MIN = 60000;
const ALL_CASES = TEST_SET.cases.map((c) => c.id);
// 예시 데이터 모드에서는 '요청 상세 보기'가 내장 예시 실행을 연다. 실제 서버에는 그 실행이 없으므로 링크를 뺀다.
const TURN_IDS = apiMode === 'mock' ? MOCK_RUNS.filter((r) => r.run.test_case_id).map((r) => r.run.turn_id) : [];

function plan(id: string, seed: number, startedAt: number, durationMs: number, configs: TestConfig[], repeats: number, caseIds: string[]): PlannedRun {
  const step = durationMs / Math.max(1, caseIds.length * configs.length * repeats);
  return { id, startedAt, stoppedAt: null, configs, repeats, caseIds, attempts: planAttempts(seed, TEST_SET.cases, configs, repeats, caseIds, startedAt, step, TURN_IDS) };
}

function initialRuns(now: number): PlannedRun[] {
  const t = Math.floor(now / MIN) * MIN;
  const lunaLow = { model: 'GPT-6 Luna', effort: 'low' } as const;
  const lunaMedium = { model: 'GPT-6 Luna', effort: 'medium' } as const;
  const solLow = { model: 'GPT-6 Sol', effort: 'low' } as const;
  return [
    plan('run-1', 11, t - 26 * 60 * MIN, 21 * MIN, [lunaMedium, solLow], 3, ALL_CASES),
    plan('run-2', 23, t - 47 * MIN, 18 * MIN, [lunaLow, lunaMedium], 3, ALL_CASES),
    // 화면을 연 시각에 절반쯤 진행된 실행
    plan('run-3', 37, t - 8 * MIN, 18 * MIN, [lunaLow, lunaMedium], 3, ALL_CASES),
  ];
}

let runs: PlannedRun[] = initialRuns(Date.now());
let nextSeed = 101;
const listeners = new Set<() => void>();

function update(next: PlannedRun[]) {
  runs = next;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** 정해 둔 시도 중 now까지 끝난 것만 담은 실행 */
function snapshot(run: PlannedRun, now: number): TestRun {
  const end = Math.min(now, run.stoppedAt ?? Infinity);
  const done = run.attempts.filter((a) => a.at <= end);
  const status: RunStatus = run.stoppedAt !== null ? 'stopped' : done.length === run.attempts.length ? 'done' : 'running';
  const last = done.at(-1)?.at ?? run.startedAt;
  return {
    id: run.id,
    startedAt: new Date(run.startedAt).toISOString(),
    updatedAt: new Date(status === 'running' ? now : status === 'stopped' ? end : last).toISOString(),
    status,
    configs: run.configs,
    repeats: run.repeats,
    caseIds: run.caseIds,
    attempts: done.map(({ at, ...a }) => ({ ...a, finishedAt: new Date(at).toISOString() })),
  };
}

export interface NewRun {
  configs: TestConfig[];
  repeats: number;
  caseIds: string[];
}

/** 예시 실행 목록. 진행 중인 실행이 있으면 1초마다 다시 그린다. 최근 실행이 앞이다. */
export function useTestRuns() {
  const planned = useSyncExternalStore(subscribe, () => runs);
  const [now, setNow] = useState(() => Date.now());
  const list = planned.map((r) => snapshot(r, now)).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const running = list.some((r) => r.status === 'running');

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const start = useCallback((input: NewRun): string => {
    const startedAt = Date.now();
    const id = `run-${runs.length + 1}`;
    const est = estimate(input.configs.map(attemptCost), JUDGE_COST, input.caseIds.length, input.repeats, PARALLEL);
    update([...runs, plan(id, nextSeed++, startedAt, est.durationMs, input.configs, input.repeats, input.caseIds)]);
    setNow(startedAt);
    return id;
  }, []);

  const stop = useCallback((id: string) => {
    const at = Date.now();
    update(runs.map((r) => (r.id === id && r.stoppedAt === null ? { ...r, stoppedAt: at } : r)));
    setNow(at);
  }, []);

  return { runs: list, start, stop };
}
