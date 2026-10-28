// 테스트 탭의 예시 실행 데이터. 탱글 서버의 테스트 실행 기능이 생기면 이 파일을 대신한다.
// 케이스는 케이스 파일(testSet.json)을 쓰고, 실행 결과만 고정 씨앗의 난수로 만든다. 예시 시도에는 탱글 응답이 없다.
import type { Attempt, AttemptCost, Effort, TestCase, TestConfig } from './testModel';

// ── 설정과 비용 ───────────────────────────────────────────────────────

export const MODELS = ['GPT-6 Luna', 'GPT-6 Sol'];
export const EFFORTS: Effort[] = ['low', 'medium', 'high'];

/** 새 실행 팝업에 처음 보이는 설정 */
export const SAMPLE_CONFIG_OPTIONS: TestConfig[] = [
  { model: 'GPT-6 Luna', effort: 'low' },
  { model: 'GPT-6 Luna', effort: 'medium' },
  { model: 'GPT-6 Sol', effort: 'low' },
  { model: 'GPT-6 Luna', effort: 'high' },
];

/** 채점 모델은 실행마다 바꾸지 않는다. */
export const JUDGE_LABEL_TEXT = 'GPT-6 Sol · 추론 medium';
export const JUDGE_COST: AttemptCost = { costUsd: 0.0049, latencyMs: 2500 };
/** 동시에 돌리는 시도 수 */
export const PARALLEL = 4;

const EFFORT_COST: Record<Effort, number> = { low: 0.0085, medium: 0.0135, high: 0.022 };
const EFFORT_LATENCY: Record<Effort, number> = { low: 4000, medium: 6200, high: 9800 };
const EFFORT_PASS: Record<Effort, number> = { low: -0.07, medium: 0.03, high: 0.06 };
const EFFORT_QUALITY: Record<Effort, number> = { low: 0, medium: 0.12, high: 0.2 };
const isSol = (c: TestConfig) => c.model.endsWith('Sol');

/** 시도 한 번의 평균 비용·응답 시간. 새 실행 어림에 쓴다. */
export function attemptCost(c: TestConfig): AttemptCost {
  return { costUsd: EFFORT_COST[c.effort] * (isSol(c) ? 1.8 : 1), latencyMs: EFFORT_LATENCY[c.effort] * (isSol(c) ? 1.25 : 1) };
}

// ── 실행 결과 만들기 ──────────────────────────────────────────────────

function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const INFO_PASS: Record<string, number> = { in_message: 0.93, from_context: 0.8, ask: 0.62 };

function passChance(c: TestCase, config: TestConfig): number {
  let p = INFO_PASS[c.info] ?? 0.8;
  if (c.list.todos + c.list.plans > 20) p -= 0.1;
  if (c.previousMessages >= 15) p -= 0.08;
  else if (c.previousMessages >= 5) p -= 0.03;
  if (c.memory !== 'none') p -= 0.04;
  if (c.changes === 'many') p -= 0.15;
  else if (c.changes === 'few') p -= 0.05;
  p += EFFORT_PASS[config.effort] + (isSol(config) ? 0.04 : 0);
  return Math.min(0.98, Math.max(0.05, p));
}

const PASS_REASON: Record<1 | 2 | 3, string> = {
  3: '정답 행동대로 처리했고 문장도 짧고 분명해요.',
  2: '정답 행동대로 처리했어요. 다만 문장이 조금 길어서 2점이에요.',
  1: '처리는 맞지만 무엇을 했는지 알려 주는 말이 없어 1점이에요.',
};

export interface PlannedAttempt extends Omit<Attempt, 'finishedAt'> {
  /** 끝나는 시각(ms) */
  at: number;
}

/** 실패해도 틀리지 않는 체크. 실행 상태는 예시 실행에서 늘 정상이다. */
const STATUS_CHECK = '실행 상태 정상';

/** 케이스마다 자주 틀리는 체크를 하나 정해 둔다. 씨앗과 상관없이 케이스 ID로 고른다. */
function weakCheck(c: TestCase, candidates: number[]): number {
  let h = 0;
  for (const ch of c.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return candidates[h % candidates.length]!;
}

/** 실패한 시도에서 틀리는 체크의 순서. 하나 이상이다. */
function failedChecks(c: TestCase, rand: () => number): Set<number> {
  const candidates = c.checks.flatMap((check, k) => (check.text === STATUS_CHECK ? [] : [k]));
  if (!candidates.length) return new Set();
  const any = () => candidates[Math.floor(rand() * candidates.length)]!;
  const out = new Set([rand() < 0.75 ? weakCheck(c, candidates) : any()]);
  if (rand() < 0.25) out.add(any());
  return out;
}

/**
 * 실행 하나의 시도를 모두 만든다. 반복마다 케이스를 돌고, 케이스마다 설정을 번갈아 부른다.
 * 시도는 startedAt부터 stepMs 간격으로 끝난다.
 */
export function planAttempts(
  seed: number,
  cases: TestCase[],
  configs: TestConfig[],
  repeats: number,
  caseIds: string[],
  startedAt: number,
  stepMs: number,
  turnIds: string[],
): PlannedAttempt[] {
  const rand = random(seed);
  const jitter = (base: number, ratio: number) => base * (1 - ratio + rand() * ratio * 2);
  const byId = new Map(cases.map((c) => [c.id, c]));
  const out: PlannedAttempt[] = [];
  for (let repeat = 1; repeat <= repeats; repeat += 1) {
    for (const id of caseIds) {
      const c = byId.get(id);
      if (!c) continue;
      configs.forEach((config, i) => {
        const failed = rand() < passChance(c, config) ? new Set<number>() : failedChecks(c, rand);
        const passed = failed.size === 0;
        const q = rand();
        const quality = passed ? (q < 0.3 + EFFORT_QUALITY[config.effort] ? 3 : q < 0.9 ? 2 : 1) : null;
        const base = attemptCost(config);
        const listSize = c.list.todos + c.list.plans;
        const index = out.length;
        out.push({
          caseId: id,
          config: i,
          repeat,
          at: Math.round(startedAt + (index + 1) * stepMs + (rand() - 0.5) * stepMs * 0.6),
          passed,
          quality,
          latencyMs: Math.round(jitter(base.latencyMs + (listSize > 20 ? 900 : listSize > 5 ? 400 : 0) + c.previousMessages * 40, 0.3)),
          costUsd: jitter(base.costUsd * (1 + c.previousMessages * 0.02), 0.2),
          checks: c.checks.map((_, k) => !failed.has(k)),
          reason: passed ? PASS_REASON[quality!] : `틀린 체크: ${[...failed].sort((a, b) => a - b).map((k) => c.checks[k]!.text).join(', ')}`,
          reply: '',
          turnId: turnIds.length ? turnIds[index % turnIds.length]! : null,
        });
      });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}
