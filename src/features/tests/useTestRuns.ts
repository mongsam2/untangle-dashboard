import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useServer } from '../../app/connection';
import { apiMode, testRunApi } from '../../api/client';
import { MOCK_RUNS } from '../../api/mock/fixtures';
import type { TestRunDetailResponse, TestRunSummary } from '../../api/types';
import { JUDGE_COST, PARALLEL, attemptCost, planAttempts, type PlannedAttempt } from './sampleData';
import { DEFAULT_GRADER, estimate, estimateFromRun, fromServerRun, latestDoneRun, type Estimate, type Grader, type RunStatus, type TestConfig, type TestRun } from './testModel';
import { CASE_FILE, TEST_SET } from './testSet';

// 테스트 탭의 실행 목록. live 모드는 고른 서버의 탱글 테스트 실행 API를, mock 모드는 아래 예시 실행 저장소를 본다.

export interface NewRun {
  configs: TestConfig[];
  repeats: number;
  caseIds: string[];
}

export interface TestRuns {
  /** 최근 실행이 앞이다. live 모드에서는 상세를 받은 실행만 시도가 차 있다. */
  runs: TestRun[];
  /** 고른 실행. 고르지 않았거나 없는 실행이면 가장 최근 실행이다. */
  run: TestRun | null;
  /** 끝난 실행 중 가장 최근 것. 테스트 셋의 최근 통과율과 '지난 실행에서 실패한 케이스'가 본다. */
  lastDone: TestRun | null;
  /** 새 실행의 채점 모델 */
  grader: Grader;
  loading: boolean;
  error: Error | null;
  /** 운영 서버에서는 실행하지 않는다. */
  canStart: boolean;
  estimate(configs: TestConfig[], caseCount: number, repeats: number): Estimate;
  /** 실행을 시작하고 새 실행 ID를 준다. */
  start(input: NewRun): Promise<string>;
  stop(id: string): Promise<void>;
}

// ── live ─────────────────────────────────────────────────────────────

/** 진행 중인 실행이 있는 동안 다시 읽는 간격 */
const POLL_MS = 3000;

function useLiveTestRuns(selected: string | null): TestRuns {
  const server = useServer();
  const client = useQueryClient();
  const api = useMemo(() => (server ? testRunApi(server) : null), [server]);
  const listKey = [server, 'test-runs'];
  const detailKey = (id: string | null) => [server, 'test-run', id];

  const list = useQuery({
    queryKey: listKey,
    queryFn: () => api!.listTestRuns(),
    enabled: !!api,
    refetchInterval: (q) => (q.state.data?.items.some((r) => r.status === 'running') ? POLL_MS : false),
  });
  const summaries = list.data?.items ?? [];
  const runId = (summaries.find((r) => r.id === selected) ?? summaries[0])?.id ?? null;
  const doneId = summaries.find((r) => r.status === 'done')?.id ?? null;
  const detailQuery = (id: string | null) => ({
    queryKey: detailKey(id),
    queryFn: () => api!.getTestRun(id!),
    enabled: !!api && !!id,
    refetchInterval: (q: { state: { data?: TestRunDetailResponse } }) => (q.state.data?.status === 'running' ? POLL_MS : false),
    select: fromServerRun,
  });
  const detail = useQuery(detailQuery(runId));
  const done = useQuery(detailQuery(doneId));

  const run = detail.data ?? null;
  const lastDone = done.data ?? null;
  const runs = summaries.map((r: TestRunSummary) => (r.id === run?.id ? run : r.id === lastDone?.id ? lastDone : fromServerRun(r)));

  const saved = async (response: TestRunDetailResponse) => {
    client.setQueryData(detailKey(response.id), response);
    await client.invalidateQueries({ queryKey: listKey });
  };

  return {
    runs,
    run,
    lastDone,
    grader: summaries[0]?.grader ?? DEFAULT_GRADER,
    loading: list.isPending || (!!runId && detail.isPending),
    error: list.error ?? detail.error,
    canStart: !!api && server !== 'prod',
    estimate: (configs, caseCount, repeats) => estimateFromRun(lastDone, configs, caseCount, repeats),
    start: async (input) => {
      const created = await api!.startTestRun({ case_file: CASE_FILE, case_ids: input.caseIds, configs: input.configs, repeats: input.repeats });
      await saved(created);
      return created.id;
    },
    stop: async (id) => {
      await saved(await api!.stopTestRun(id));
    },
  };
}

// ── mock ─────────────────────────────────────────────────────────────

// 예시 실행 저장소. 진행 중인 실행은 시각에 맞춰 시도가 하나씩 끝나고, 새 실행도 같은 방식으로 돌아간다.
// 새로고침하면 처음으로 돌아간다.

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
// 예시 데이터 모드에서는 '요청 상세 보기'가 내장 예시 실행을 연다.
const TURN_IDS = MOCK_RUNS.filter((r) => r.run.test_case_id).map((r) => r.run.turn_id);

function plan(id: string, seed: number, startedAt: number, durationMs: number, configs: TestConfig[], repeats: number, caseIds: string[]): PlannedRun {
  const step = durationMs / Math.max(1, caseIds.length * configs.length * repeats);
  return { id, startedAt, stoppedAt: null, configs, repeats, caseIds, attempts: planAttempts(seed, TEST_SET.cases, configs, repeats, caseIds, startedAt, step, TURN_IDS) };
}

function initialRuns(now: number): PlannedRun[] {
  const t = Math.floor(now / MIN) * MIN;
  const lunaLow = { model: 'gpt-6-luna', effort: 'low' } as const;
  const lunaMedium = { model: 'gpt-6-luna', effort: 'medium' } as const;
  const solLow = { model: 'gpt-6-sol', effort: 'low' } as const;
  return [
    plan('run-1', 11, t - 26 * 60 * MIN, 21 * MIN, [lunaMedium, solLow], 3, ALL_CASES),
    plan('run-2', 23, t - 47 * MIN, 18 * MIN, [lunaLow, lunaMedium], 3, ALL_CASES),
    // 화면을 연 시각에 절반쯤 진행된 실행
    plan('run-3', 37, t - 8 * MIN, 18 * MIN, [lunaLow, lunaMedium], 3, ALL_CASES),
  ];
}

let runs: PlannedRun[] = apiMode === 'mock' ? initialRuns(Date.now()) : [];
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
    grader: DEFAULT_GRADER,
    attempts: done.map(({ at, ...a }) => ({ ...a, finishedAt: new Date(at).toISOString() })),
  };
}

const sampleEstimate = (configs: TestConfig[], caseCount: number, repeats: number) => estimate(configs.map(attemptCost), JUDGE_COST, caseCount, repeats, PARALLEL);

/** 예시 실행 목록. 진행 중인 실행이 있으면 1초마다 다시 그린다. */
function useSampleTestRuns(selected: string | null): TestRuns {
  const planned = useSyncExternalStore(subscribe, () => runs);
  const [now, setNow] = useState(() => Date.now());
  const list = planned.map((r) => snapshot(r, now)).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const running = list.some((r) => r.status === 'running');

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const start = useCallback(async (input: NewRun): Promise<string> => {
    const startedAt = Date.now();
    const id = `run-${runs.length + 1}`;
    const est = sampleEstimate(input.configs, input.caseIds.length, input.repeats);
    update([...runs, plan(id, nextSeed++, startedAt, est.durationMs ?? 0, input.configs, input.repeats, input.caseIds)]);
    setNow(startedAt);
    return id;
  }, []);

  const stop = useCallback(async (id: string) => {
    const at = Date.now();
    update(runs.map((r) => (r.id === id && r.stoppedAt === null ? { ...r, stoppedAt: at } : r)));
    setNow(at);
  }, []);

  return {
    runs: list,
    run: list.find((r) => r.id === selected) ?? list[0] ?? null,
    lastDone: latestDoneRun(list),
    grader: DEFAULT_GRADER,
    loading: false,
    error: null,
    canStart: true,
    estimate: sampleEstimate,
    start,
    stop,
  };
}

/** 모드는 빌드할 때 정해지므로 고른 훅이 바뀌지 않는다. */
export const useTestRuns: (selected: string | null) => TestRuns = apiMode === 'live' ? useLiveTestRuns : useSampleTestRuns;
