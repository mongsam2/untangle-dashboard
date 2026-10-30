// 테스트 탭의 데이터 모양과 화면 수치 계산. 케이스 파일과 실행 기록을 받아 표·카드에 쓰는 값으로 바꾼다.
// 실행 기록은 끝난 시도만 담는다. 통과율·평균은 모두 끝난 시도 기준이다.
import type { TestAttemptItem, TestRunDetailResponse, TestRunSummary } from '../../api/types';

export type Judge = 'code' | 'grader';

export const JUDGE_LABEL: Record<Judge, string> = { code: '코드', grader: '채점' };

/** 케이스의 체크 항목 하나. 판정은 코드 검사나 채점 모델이 한다. */
export interface TestCheck {
  text: string;
  judge: Judge;
}

export type CategoryKey = 'changes' | 'target' | 'feature' | 'info' | 'list' | 'position' | 'memory';

export interface CategoryValue {
  id: string;
  /** 분포·통과율 표의 이름 */
  label: string;
  /** 케이스 표의 짧은 이름 */
  short: string;
}

export interface Category {
  key: CategoryKey;
  title: string;
  values: CategoryValue[];
}

const v = (id: string, label: string, short = label): CategoryValue => ({ id, label, short });

export const CATEGORIES: Category[] = [
  {
    key: 'feature',
    title: '사용자 요청',
    values: [
      v('todo_create', '할 일 추가'),
      v('todo_update', '할 일 고치기'),
      v('todo_delete', '할 일 지우기'),
      v('todo_split', '할 일 쪼개기'),
      v('plan_create', '계획 추가'),
      v('plan_update', '계획 고치기'),
      v('plan_split', '계획 쪼개기'),
      v('plan_delete', '계획 지우기'),
      v('move', '할 일↔계획 옮기기', '옮기기'),
      v('briefing', '오늘 할 일 묻기'),
      v('query', '목록 묻기'),
      v('memory_only', '기억 얘기만'),
    ],
  },
  {
    key: 'info',
    title: '필요한 정보',
    values: [v('in_message', '말에 다 있음'), v('from_context', '앞 대화·목록·기억에서 찾아야 함', '앞 대화·목록·기억에서 찾기'), v('ask', '되물어야 함')],
  },
  { key: 'changes', title: '바꾸는 할 일·계획 수', values: [v('none', '안 바꿈'), v('one', '1개', '1개 바꿈'), v('few', '2~4개', '2~4개 바꿈'), v('many', '5개 이상', '5개 이상 바꿈')] },
  { key: 'target', title: '새로 만드나 고치나', values: [v('new', '새로 만듦'), v('existing', '있던 걸 고침'), v('both', '둘 다', '만들고 고침'), v('none', '안 건드림')] },
  { key: 'list', title: '미리 넣어 둔 할 일·계획', values: [v('empty', '0개', '목록 0개'), v('small', '1~5개', '목록 1~5개'), v('medium', '6~20개', '목록 6~20개'), v('large', '21개 이상', '목록 21개 이상')] },
  {
    key: 'position',
    title: '앞선 대화',
    values: [v('first', '없음', '앞선 대화 없음'), v('short', '1~4번 주고받음', '대화 1~4번'), v('long', '5~14번 주고받음', '대화 5~14번'), v('very_long', '15번 이상 주고받음', '대화 15번 이상')],
  },
  {
    key: 'memory',
    title: '기억 다루기',
    values: [v('none', '기억 안 씀'), v('apply', '기억대로 답하기'), v('update', '새로 적기·고치기', '기억 적기·고치기'), v('keep', '적으면 안 됨', '기억에 안 적음'), v('show', '기억 알려주기')],
  },
];

/** 테스트 셋의 카테고리별 케이스 수는 세 열로 나눠 보인다. 사용자 요청은 값이 많아 한 열을 혼자 쓴다. */
export const COVERAGE_COLUMNS: CategoryKey[][] = [['feature'], ['info', 'changes', 'target'], ['list', 'position', 'memory']];

export function categoryOf(key: CategoryKey): Category {
  return CATEGORIES.find((c) => c.key === key)!;
}

export function valueOf(key: CategoryKey, id: string): CategoryValue | undefined {
  return categoryOf(key).values.find((x) => x.id === id);
}

export interface TestCase {
  id: string;
  /** 테스트가 보내는 마지막 사용자 요청 */
  message: string;
  /** 기능 값 ID. 여러 개일 수 있고 첫 번째가 대표 기능이다. */
  features: string[];
  changes: string;
  target: string;
  info: string;
  /** 기억 카테고리 값 */
  memory: string;
  /** 이전 대화의 사용자 메시지 수. 0이면 첫 턴이다. */
  previousMessages: number;
  /** 테스트 계정에 미리 넣어 두는 목록 */
  list: { todos: number; plans: number };
  /** 상황과 정답 행동 */
  expected: string;
  checks: TestCheck[];
  setup: CaseSetup;
}

/** 케이스가 고른 준비 묶음의 이름. 케이스 결과 머리에 보인다. */
export interface CaseSetup {
  list: string;
  memory: string;
  /** 시작 기억의 줄 수. 0이면 빈 기억이다. */
  memoryLines: number;
  /** 이전 대화 이름. 없으면 null */
  conversation: string | null;
  /** 공통 대본의 끝부분을 이 케이스에 맞게 바꿨는지 */
  tailChanged: boolean;
}

export interface QualityExample {
  feature: string;
  level: 1 | 2 | 3;
}

export interface TestSet {
  cases: TestCase[];
  /** 채점 모델에게 보여 주는 기능별 품질 단계 예시 */
  qualityExamples: QualityExample[];
}

export function listValue(c: TestCase): string {
  const n = c.list.todos + c.list.plans;
  return n === 0 ? 'empty' : n <= 5 ? 'small' : n <= 20 ? 'medium' : 'large';
}

export function positionValue(c: TestCase): string {
  const n = c.previousMessages;
  return n === 0 ? 'first' : n <= 4 ? 'short' : n <= 14 ? 'long' : 'very_long';
}

/** 케이스가 카테고리마다 가진 값. 기능만 여러 개일 수 있다. */
export function caseValues(c: TestCase, key: CategoryKey): string[] {
  switch (key) {
    case 'changes':
      return [c.changes];
    case 'target':
      return [c.target];
    case 'feature':
      return c.features;
    case 'info':
      return [c.info];
    case 'list':
      return [listValue(c)];
    case 'position':
      return [positionValue(c)];
    case 'memory':
      return [c.memory];
  }
}

const shortOf = (key: CategoryKey, id: string) => valueOf(key, id)?.short ?? id;

/** 케이스 표의 대표 사용자 요청 이름 */
export function featureShort(c: TestCase): string {
  return c.features[0] ? shortOf('feature', c.features[0]) : '-';
}

/** 케이스 표의 '나머지 카테고리' 칸: 사용자 요청을 뺀 값을 짧은 이름으로 잇는다. 기억은 걸리는 케이스만 붙인다. */
export function restSummary(c: TestCase): string {
  const keys: CategoryKey[] = ['info', 'changes', 'target', 'list', 'position', ...(c.memory === 'none' ? [] : (['memory'] as const))];
  return keys.map((k) => shortOf(k, caseValues(c, k)[0]!)).join(' · ');
}

export interface CaseTag {
  text: string;
  tone: 'neutral' | 'info';
}

/** 케이스 결과 머리의 꼬리표. 사용자 요청은 회색, 나머지 카테고리는 파랑이다. 앞선 대화는 실제 사용자 메시지 수로 보인다. */
export function caseTags(c: TestCase): CaseTag[] {
  return [
    ...c.features.map((f) => ({ text: valueOf('feature', f)?.label ?? f, tone: 'neutral' as const })),
    ...[
      shortOf('info', c.info),
      shortOf('changes', c.changes),
      shortOf('target', c.target),
      shortOf('list', listValue(c)),
      c.previousMessages ? `앞선 대화 ${c.previousMessages}번` : shortOf('position', positionValue(c)),
      ...(c.memory === 'none' ? [] : [shortOf('memory', c.memory)]),
    ].map((text) => ({ text, tone: 'info' as const })),
  ];
}

export function previousText(c: TestCase): string {
  if (!c.previousMessages) return '없음';
  return [c.setup.conversation, `사용자 메시지 ${c.previousMessages}개`, c.setup.tailChanged ? '끝부분 바꿈' : null].filter(Boolean).join(' · ');
}

export function listText(c: TestCase): string {
  return c.list.todos + c.list.plans ? `${c.setup.list} · 할 일 ${c.list.todos} · 계획 ${c.list.plans}` : '없음';
}

export function memoryText(c: TestCase): string {
  return c.setup.memoryLines ? `${c.setup.memory} · ${c.setup.memoryLines}줄` : '없음';
}

export interface CoverageRow {
  id: string;
  label: string;
  count: number;
  /** 막대 길이. 모든 카테고리에서 가장 많은 값이 1이다. */
  ratio: number;
}

export interface CoverageGroup {
  key: CategoryKey;
  title: string;
  rows: CoverageRow[];
}

/** 카테고리별 케이스 수. 케이스가 없는 값도 줄을 남겨 빈 곳이 보이게 한다. */
export function coverage(cases: TestCase[]): CoverageGroup[] {
  const groups = CATEGORIES.map((cat) => ({
    key: cat.key,
    title: cat.key === 'feature' ? `${cat.title} (여러 개 선택)` : cat.title,
    rows: cat.values.map((val) => ({ id: val.id, label: val.label, count: cases.filter((c) => caseValues(c, cat.key).includes(val.id)).length, ratio: 0 })),
  }));
  const max = Math.max(1, ...groups.flatMap((g) => g.rows.map((r) => r.count)));
  for (const g of groups) for (const r of g.rows) r.ratio = r.count / max;
  return groups;
}

// ── 실행 ──────────────────────────────────────────────────────────────

export type Effort = 'low' | 'medium' | 'high';

export const EFFORTS: Effort[] = ['low', 'medium', 'high'];

/** 비교 설정 하나: 모델 ID와 추론 강도 */
export interface TestConfig {
  model: string;
  effort: Effort;
}

/** 새 실행 팝업에서 고르는 탱글 모델 */
export const MODELS = ['gpt-6-luna', 'gpt-6-sol'];

/** 새 실행 팝업에 처음 보이는 설정 */
export const CONFIG_OPTIONS: TestConfig[] = [
  { model: 'gpt-6-luna', effort: 'low' },
  { model: 'gpt-6-luna', effort: 'medium' },
  { model: 'gpt-6-sol', effort: 'low' },
  { model: 'gpt-6-luna', effort: 'high' },
];

const MODEL_LABELS: Record<string, string> = {
  'gpt-6-luna': 'GPT-6 Luna',
  'gpt-6-sol': 'GPT-6 Sol',
  'claude-opus-5-5': 'Claude Opus 5.5',
};

/** 모델 ID의 화면 이름. 모르는 모델은 ID 그대로다. */
export function modelLabel(id: string): string {
  return MODEL_LABELS[id] ?? id;
}

/** 채점 모델과 추론 강도. 탱글 서버 설정이 정하고 실행마다 기록한다. */
export interface Grader {
  model: string;
  effort: string;
}

/** 탱글 서버의 기본 채점 설정. 아직 실행이 없을 때 새 실행 팝업에 보인다. */
export const DEFAULT_GRADER: Grader = { model: 'claude-opus-5-5', effort: 'medium' };

export function graderLabel(g: Grader): string {
  return `${modelLabel(g.model)} · 추론 ${g.effort}`;
}

/** 한 실행에서 비교하는 설정은 최대 2개다(A·B). */
export const MAX_CONFIGS = 2;
export const CONFIG_LETTERS = ['A', 'B'] as const;
export type ConfigLetter = (typeof CONFIG_LETTERS)[number];

export function sameConfig(a: TestConfig, b: TestConfig): boolean {
  return a.model === b.model && a.effort === b.effort;
}

/** 칩에 쓰는 짧은 이름. 'gpt-6-luna' + low → 'Luna · low' */
export function configShort(c: TestConfig): string {
  return `${modelLabel(c.model).split(' ').at(-1)} · ${c.effort}`;
}

/** 체크 항목 하나의 판정. 판정하지 않았으면(앞선 코드 판정 실패·채점 실패·실행 실패) passed가 null이다. */
export interface CheckResult {
  passed: boolean | null;
  /** 실제로 판정한 쪽. 코드 판정으로 적은 항목도 정해진 표기가 아니면 채점 모델이 판정한다. */
  judgedBy: Judge | null;
  reason: string | null;
}

export interface Attempt {
  caseId: string;
  /** 실행의 configs 순서(0 = A) */
  config: number;
  /** 몇 번째 반복인지(1부터) */
  repeat: number;
  finishedAt: string;
  passed: boolean;
  /** 품질 점수. 실패한 시도는 채점하지 않는다. */
  quality: 1 | 2 | 3 | null;
  latencyMs: number;
  /** 탱글 비용. 단가를 모르는 모델이면 null */
  costUsd: number | null;
  /** 채점 비용. 채점하지 않았으면 null */
  graderCostUsd: number | null;
  /** 케이스 체크 항목 순서대로 */
  checks: CheckResult[];
  reason: string;
  reply: string;
  /** 탱글 실행 기록의 turn_id. 있으면 요청 상세를 연다. */
  turnId: string | null;
}

export type RunStatus = 'running' | 'done' | 'stopped';

export const RUN_STATUS_LABEL: Record<RunStatus, string> = { running: '진행 중', done: '완료', stopped: '중단됨' };

export interface TestRun {
  id: string;
  startedAt: string;
  /** 마지막으로 시도가 끝난 시각. 진행 중이면 지금 시각이다. */
  updatedAt: string;
  status: RunStatus;
  configs: TestConfig[];
  repeats: number;
  caseIds: string[];
  grader: Grader;
  /** 끝난 시도. 끝난 순서대로다. */
  attempts: Attempt[];
}

function fromServerAttempt(a: TestAttemptItem): Attempt {
  return {
    caseId: a.case_id,
    config: a.config,
    repeat: a.repeat,
    finishedAt: a.finished_at,
    passed: a.passed,
    quality: a.quality,
    latencyMs: a.latency_ms,
    costUsd: a.cost_usd,
    graderCostUsd: a.grader_cost_usd,
    checks: a.checks.map((c) => ({ passed: c.passed, judgedBy: c.judged_by, reason: c.reason })),
    reason: a.reason,
    reply: a.reply,
    turnId: a.turn_id,
  };
}

/** 탱글 서버의 테스트 실행 응답을 화면 모양으로 바꾼다. 목록 응답에는 시도가 없다. */
export function fromServerRun(r: TestRunSummary | TestRunDetailResponse): TestRun {
  return {
    id: r.id,
    startedAt: r.started_at,
    updatedAt: r.updated_at,
    status: r.status,
    configs: r.configs.map((c) => ({ model: c.model, effort: c.effort as Effort })),
    repeats: r.repeats,
    caseIds: r.case_ids,
    grader: r.grader,
    attempts: 'attempts' in r ? r.attempts.map(fromServerAttempt) : [],
  };
}

const KST_OFFSET_MS = 9 * 3600000;
const pad = (x: number) => String(x).padStart(2, '0');

/** 실행 이름: 한국 시간 시작 시각. '10/27 15:02 실행' */
export function runLabel(run: Pick<TestRun, 'startedAt'>): string {
  const d = new Date(Date.parse(run.startedAt) + KST_OFFSET_MS);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} 실행`;
}

export function totalAttempts(run: TestRun): number {
  return run.caseIds.length * run.configs.length * run.repeats;
}

/** 끝난 실행 중 가장 최근 것. 테스트 셋의 '최근 통과율'이 이 실행을 본다. */
export function latestDoneRun(runs: TestRun[]): TestRun | null {
  return [...runs].filter((r) => r.status === 'done').sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0] ?? null;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const known = (xs: (number | null)[]) => xs.filter((x): x is number => x !== null);
/** 아는 값만 더한다. 아는 값이 없으면 null */
const knownSum = (xs: (number | null)[]) => (known(xs).length ? sum(known(xs)) : null);

function passRate(attempts: Attempt[]): number | null {
  return attempts.length ? attempts.filter((a) => a.passed).length / attempts.length : null;
}

/** 느린 10%의 경계(90번째 백분위수, 가장 가까운 순위). */
export function p90(xs: number[]): number | null {
  if (!xs.length) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.9) - 1)]!;
}

export interface ConfigProgress {
  done: number;
  total: number;
  passRate: number | null;
  avgLatencyMs: number | null;
  costUsd: number | null;
}

export function configProgress(run: TestRun): ConfigProgress[] {
  return run.configs.map((_, i) => {
    const mine = run.attempts.filter((a) => a.config === i);
    return {
      done: mine.length,
      total: run.caseIds.length * run.repeats,
      passRate: passRate(mine),
      avgLatencyMs: mean(mine.map((a) => a.latencyMs)),
      costUsd: knownSum(mine.map((a) => a.costUsd)),
    };
  });
}

export interface RunProgress {
  done: number;
  total: number;
  ratio: number;
  elapsedMs: number;
  /** 지금까지의 속도로 어림한 남은 시간. 끝난 시도가 없으면 null */
  remainingMs: number | null;
  costUsd: number | null;
  graderCostUsd: number | null;
}

export function runProgress(run: TestRun): RunProgress {
  const done = run.attempts.length;
  const total = totalAttempts(run);
  const elapsedMs = Math.max(0, Date.parse(run.updatedAt) - Date.parse(run.startedAt));
  return {
    done,
    total,
    ratio: total ? done / total : 0,
    elapsedMs,
    remainingMs: done ? (elapsedMs / done) * (total - done) : null,
    costUsd: knownSum(run.attempts.map((a) => a.costUsd)),
    graderCostUsd: knownSum(run.attempts.map((a) => a.graderCostUsd)),
  };
}

export interface ConfigSummary {
  passRate: number | null;
  quality: number | null;
  avgLatencyMs: number | null;
  p90LatencyMs: number | null;
  costPerAttempt: number | null;
  costUsd: number | null;
}

export type SummaryColumn = keyof ConfigSummary;

/** 칸마다 높을수록 좋은지. 결과 비교 표에서 더 나은 설정 칸을 초록으로 칠한다. */
export const HIGHER_IS_BETTER: Record<SummaryColumn, boolean> = {
  passRate: true,
  quality: true,
  avgLatencyMs: false,
  p90LatencyMs: false,
  costPerAttempt: false,
  costUsd: false,
};

export function configSummaries(run: TestRun): ConfigSummary[] {
  return run.configs.map((_, i) => {
    const mine = run.attempts.filter((a) => a.config === i);
    const latencies = mine.map((a) => a.latencyMs);
    const costs = mine.map((a) => a.costUsd);
    return {
      passRate: passRate(mine),
      quality: mean(mine.flatMap((a) => (a.quality === null ? [] : [a.quality]))),
      avgLatencyMs: mean(latencies),
      p90LatencyMs: p90(latencies),
      costPerAttempt: mean(known(costs)),
      costUsd: knownSum(costs),
    };
  });
}

/** 칸마다 더 나은 설정의 순서. 값이 하나뿐이거나 모두 같으면 null이다. */
export function bestIndex(summaries: ConfigSummary[], column: SummaryColumn): number | null {
  const values = summaries.map((s) => s[column]);
  if (values.filter((x) => x !== null).length < 2) return null;
  const better = HIGHER_IS_BETTER[column] ? Math.max(...(values.filter((x) => x !== null) as number[])) : Math.min(...(values.filter((x) => x !== null) as number[]));
  const hits = values.flatMap((x, i) => (x === better ? [i] : []));
  return hits.length === 1 ? hits[0]! : null;
}

export interface CategoryRateRow {
  id: string;
  label: string;
  /** 이 실행에 든 케이스 중 이 값을 가진 수 */
  count: number;
  /** 설정별 통과율 */
  rates: (number | null)[];
}

export interface CategoryRateGroup {
  key: CategoryKey;
  title: string;
  rows: CategoryRateRow[];
}

/** 카테고리 값별 통과율. 이 실행에 그 값의 케이스가 없으면 줄을 뺀다. */
export function categoryRates(run: TestRun, cases: TestCase[]): CategoryRateGroup[] {
  const inRun = cases.filter((c) => run.caseIds.includes(c.id));
  return CATEGORIES.map((cat) => ({
    key: cat.key,
    title: cat.title,
    rows: cat.values.flatMap((val) => {
      const ids = new Set(inRun.filter((c) => caseValues(c, cat.key).includes(val.id)).map((c) => c.id));
      if (!ids.size) return [];
      const mine = run.attempts.filter((a) => ids.has(a.caseId));
      return [{ id: val.id, label: val.label, count: ids.size, rates: run.configs.map((_, i) => passRate(mine.filter((a) => a.config === i))) }];
    }),
  })).filter((g) => g.rows.length);
}

export interface FailedCheck {
  text: string;
  /** 처음 틀린 시도를 판정한 쪽 */
  judge: Judge;
  /** 설정별 틀린 시도 수 */
  counts: number[];
}

/** 자주 틀린 체크 항목. 같은 문장의 체크는 케이스가 달라도 하나로 센다. 판정하지 않은 항목은 세지 않는다. */
export function frequentFailures(run: TestRun, cases: TestCase[], limit = 5): FailedCheck[] {
  const byId = new Map(cases.map((c) => [c.id, c]));
  const rows = new Map<string, FailedCheck>();
  for (const a of run.attempts) {
    const c = byId.get(a.caseId);
    if (!c) continue;
    a.checks.forEach((result, i) => {
      const check = c.checks[i];
      if (result.passed !== false || !check) return;
      const row = rows.get(check.text) ?? { text: check.text, judge: result.judgedBy ?? check.judge, counts: run.configs.map(() => 0) };
      row.counts[a.config] = (row.counts[a.config] ?? 0) + 1;
      rows.set(check.text, row);
    });
  }
  return [...rows.values()].sort((x, y) => sum(y.counts) - sum(x.counts) || x.text.localeCompare(y.text)).slice(0, limit);
}

export interface PassCount {
  passed: number;
  total: number;
}

/** 케이스 하나의 설정별 반복 통과 수 */
export function casePassCounts(run: TestRun, caseId: string): PassCount[] {
  return run.configs.map((_, i) => {
    const mine = run.attempts.filter((a) => a.caseId === caseId && a.config === i);
    return { passed: mine.filter((a) => a.passed).length, total: mine.length };
  });
}

/** 케이스 하나의 통과율. 모든 설정의 시도를 합쳐 센다. */
export function casePassRate(run: TestRun | null, caseId: string): number | null {
  return run ? passRate(run.attempts.filter((a) => a.caseId === caseId)) : null;
}

/** 설정 중 가장 높은 통과율. 테스트 셋의 '최근 실행 통과율'이다. */
export function bestPassRate(run: TestRun): number | null {
  const rates = configSummaries(run).flatMap((s) => (s.passRate === null ? [] : [s.passRate]));
  return rates.length ? Math.max(...rates) : null;
}

export interface CaseFilter {
  key: CategoryKey;
  value: string;
}

/** 주소의 카테고리 필터를 검사한다. 없는 카테고리·값이면 null이다. */
export function toCaseFilter(raw: { key: string; value: string } | null): CaseFilter | null {
  const cat = CATEGORIES.find((c) => c.key === raw?.key);
  return raw && cat?.values.some((x) => x.id === raw.value) ? { key: cat.key, value: raw.value } : null;
}

export function filterTitle(f: CaseFilter): string {
  return `${categoryOf(f.key).title}: ${valueOf(f.key, f.value)?.label ?? f.value}`;
}

/** 실행에 든 케이스. 필터가 있으면 그 카테고리 값을 가진 케이스만, ID 순서로 */
export function casesInRun(run: TestRun, cases: TestCase[], filter: CaseFilter | null): TestCase[] {
  return cases
    .filter((c) => run.caseIds.includes(c.id) && (!filter || caseValues(c, filter.key).includes(filter.value)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** 지난 실행에서 한 번이라도 실패한 케이스 */
export function failedCaseIds(run: TestRun | null): string[] {
  if (!run) return [];
  return run.caseIds.filter((id) => run.attempts.some((a) => a.caseId === id && !a.passed));
}

// ── 색과 표기 ──────────────────────────────────────────────────────────

export type RateLevel = 'good' | 'mid' | 'bad' | 'empty';

/** 통과율 칸 색: 85% 이상 초록, 70~84% 노랑, 70% 미만 빨강. */
export function rateLevel(rate: number | null): RateLevel {
  if (rate === null) return 'empty';
  const pct = Math.round(rate * 100);
  return pct >= 85 ? 'good' : pct >= 70 ? 'mid' : 'bad';
}

/** 반복 통과 수 칸 색: 전부 통과 초록, 절반 넘게 통과 노랑, 그 밖 빨강. */
export function countLevel({ passed, total }: PassCount): RateLevel {
  if (!total) return 'empty';
  return passed === total ? 'good' : passed / total > 0.5 ? 'mid' : 'bad';
}

export function fmtRate(rate: number | null): string {
  return rate === null ? '–' : Math.round(rate * 100) + '%';
}

export function fmtSeconds(ms: number | null): string {
  return ms === null ? '–' : (ms / 1000).toFixed(1) + 's';
}

export function fmtUsd(usd: number | null, digits = 3): string {
  return usd === null ? '–' : '$' + usd.toFixed(digits);
}

export function fmtQuality(q: number | null, digits = 1): string {
  return q === null ? '–' : q.toFixed(digits);
}

export function fmtMinutes(ms: number): string {
  return Math.max(1, Math.round(ms / 60000)) + '분';
}

// ── 새 실행 어림 ───────────────────────────────────────────────────────

export interface AttemptCost {
  costUsd: number;
  latencyMs: number;
}

export interface Estimate {
  calls: number;
  /** 어림할 근거가 없으면 null */
  costUsd: number | null;
  durationMs: number | null;
}

/**
 * 새 실행의 호출 수·비용·시간 어림. 시도마다 탱글 한 번과 채점 한 번을 부른다.
 * 시간은 parallel개 시도를 동시에 돌린다고 보고 나눈다.
 */
export function estimate(perConfig: AttemptCost[], judge: AttemptCost, caseCount: number, repeats: number, parallel: number): Estimate {
  const each = caseCount * repeats;
  const calls = each * perConfig.length;
  return {
    calls,
    costUsd: sum(perConfig.map((c) => each * (c.costUsd + judge.costUsd))),
    durationMs: sum(perConfig.map((c) => each * (c.latencyMs + judge.latencyMs))) / Math.max(1, parallel),
  };
}

/**
 * 지난 실행의 실제 기록으로 새 실행을 어림한다. 비용은 같은 설정의 시도당 탱글·채점 비용 평균이고,
 * 고른 설정 중 하나라도 지난 실행에 없거나 비용 기록이 없으면 null이다.
 * 시간은 지난 실행이 시도 하나를 끝내는 데 걸린 평균 간격(동시 실행 포함)에 시도 수를 곱한다.
 */
export function estimateFromRun(reference: TestRun | null, configs: TestConfig[], caseCount: number, repeats: number): Estimate {
  const each = caseCount * repeats;
  const calls = each * configs.length;
  if (!reference?.attempts.length) return { calls, costUsd: null, durationMs: null };
  const perConfig = configs.map((config) => {
    const index = reference.configs.findIndex((c) => sameConfig(c, config));
    const mine = reference.attempts.filter((a) => a.config === index);
    return mean(known(mine.map((a) => (a.costUsd === null ? null : a.costUsd + (a.graderCostUsd ?? 0)))));
  });
  const elapsedMs = Math.max(0, Date.parse(reference.updatedAt) - Date.parse(reference.startedAt));
  return {
    calls,
    costUsd: perConfig.every((x) => x !== null) ? sum(perConfig.map((x) => each * x!)) : null,
    durationMs: (elapsedMs / reference.attempts.length) * calls,
  };
}
