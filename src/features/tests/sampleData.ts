// 테스트 탭의 예시 데이터. 실제 케이스 파일과 탱글 서버의 테스트 실행 기능이 생기면 이 파일을 대신한다.
// 케이스는 화면 모양을 보여 주려고 고른 18개이고, 실행 결과는 고정 씨앗의 난수로 만든다.
import type { Attempt, AttemptCost, Effort, QualityExample, TestCase, TestCheck, TestConfig, TestSet } from './testModel';
import { CATEGORIES } from './testModel';

// ── 체크 항목 ─────────────────────────────────────────────────────────
// 같은 문장의 체크는 '자주 틀린 체크 항목'에서 하나로 센다.

const code = (text: string): TestCheck => ({ text, judge: 'code' });
const grader = (text: string): TestCheck => ({ text, judge: 'grader' });

const K = {
  status: code('실행 상태가 정상'),
  planKind: code('할 일이 아니라 계획으로 만듦'),
  todoKind: code('계획이 아니라 할 일로 만듦'),
  allTodos: code('말한 할 일이 모두 들어감'),
  cardCount: code('카드가 4장 이하임'),
  dateTime: code('날짜·시각 값이 맞음'),
  target: code('가리킨 항목을 정확히 건드림'),
  moveCard: code('옮기기 카드가 나옴'),
  deleteCard: code('삭제 카드가 나옴'),
  subtasks: code('하위 작업이 3개임'),
  keepSubtasks: code('하위 작업을 그대로 둠'),
  noPlanChange: code('계획 변경 도구를 쓰지 않음'),
  noPlanCreate: code('계획 생성 도구를 쓰지 않음'),
  noChange: code('변경 도구를 쓰지 않음'),
  askNoCard: code('카드 없이 질문이 나옴'),
  twoPlans: code('선택지에 후보 계획 2개가 있음'),
  twoTodos: code('선택지에 후보 할 일 2개가 있음'),
  options: code('선택지가 2~4개임'),
  oneQuestion: code('질문이 하나뿐임'),
  briefingCard: code('오늘 브리핑 카드가 나옴'),
  userTitle: grader('새 항목 제목이 사용자 표현 그대로임'),
  askClear: grader('질문이 짧고 분명함'),
  replyShort: grader('답이 짧고 분명함'),
  firstSmall: grader('첫 하위 작업이 5분 안에 끝남'),
  briefingOrder: grader('급한 일부터 순서를 잡음'),
  answerFact: grader('물어본 날짜를 정확히 알려 줌'),
};

interface SampleCase extends TestCase {
  /** 실패한 시도에서 틀리는 체크 항목의 순서 */
  failChecks: number[];
  passReply: string;
  failReply: string;
  failReason: string;
}

// 요청 시각은 2026-11-04(수) 오전 10시로 고정한다. '내일'은 11/5다.
const CASES: SampleCase[] = [
  {
    id: 'C001',
    message: '내일 오후 3시에 치과 예약 넣어줘',
    features: ['plan_create'],
    changes: 'one',
    target: 'new',
    info: 'in_message',
    previousMessages: 0,
    list: { todos: 0, plans: 0 },
    expected: '치과 예약 계획 만들기 (11/5 오후 3시)',
    checks: [K.status, K.planKind, K.dateTime, K.userTitle],
    failChecks: [2],
    passReply: '내일 오후 3시에 치과 예약을 넣어 둘게요.\n[카드] 치과 예약 · 11/5 15:00',
    failReply: '내일 치과 예약을 넣어 둘게요.\n[카드] 치과 예약 · 11/5 03:00',
    failReason: '오후 3시를 새벽 3시로 넣었어요.',
  },
  {
    id: 'C007',
    message: '이번 주에 빨래, 장보기, 보고서 초안, 운동 해야 돼',
    features: ['todo_create'],
    changes: 'few',
    target: 'new',
    info: 'in_message',
    previousMessages: 0,
    list: { todos: 3, plans: 2 },
    expected: '할 일 4개 추가 카드',
    checks: [K.status, K.todoKind, K.allTodos, K.cardCount, K.userTitle, K.replyShort],
    failChecks: [1, 2],
    passReply: '이번 주 할 일 4개를 넣어 둘게요.\n[카드] 빨래 · 장보기 · 보고서 초안 · 운동',
    failReply: '할 일 3개를 넣고 운동은 계획으로 잡아 둘게요.\n[카드] 빨래 · 장보기 · 보고서 초안 · 운동(계획)',
    failReason: '운동을 날짜 없는 계획으로 만들어 할 일은 3개만 들어갔어요.',
  },
  {
    id: 'C009',
    message: '운동 시간 바꿔줘',
    features: ['plan_update'],
    changes: 'one',
    target: 'existing',
    info: 'ask',
    previousMessages: 3,
    list: { todos: 6, plans: 4 },
    expected: '몇 시로 바꿀지 되묻기',
    checks: [K.status, K.noPlanChange, K.askNoCard, K.askClear],
    failChecks: [1, 2],
    passReply: '운동을 몇 시로 옮길까요?',
    failReply: '운동을 오후 8시로 옮겨 둘게요.\n[카드] 운동 · 19:00 → 20:00',
    failReason: '바꿀 시각을 묻지 않고 한 시간 뒤로 옮기는 카드를 냈어요.',
  },
  {
    id: 'C012',
    message: '보고서 초안이 너무 커서 못 하겠어 쪼개줘',
    features: ['todo_split'],
    changes: 'one',
    target: 'existing',
    info: 'in_message',
    previousMessages: 2,
    list: { todos: 8, plans: 4 },
    expected: '보고서 초안을 하위 작업 3개로 쪼개기',
    checks: [K.status, K.target, K.subtasks, K.firstSmall, K.replyShort],
    failChecks: [3],
    passReply: '보고서 초안을 세 단계로 나눠 봤어요.\n[카드] 목차 세 줄 쓰기 · 자료 찾기 · 초안 쓰기',
    failReply: '보고서 초안을 세 단계로 나눠 봤어요.\n[카드] 자료 다 모으기 · 초안 쓰기 · 다듬기',
    failReason: "첫 하위 작업이 '자료 다 모으기'라 5분 안에 끝나지 않아요.",
  },
  {
    id: 'C014',
    message: '저번에 말한 거 계획에 넣어줘',
    features: ['move'],
    changes: 'one',
    target: 'existing',
    info: 'ask',
    previousMessages: 6,
    list: { todos: 7, plans: 5 },
    expected: '어떤 할 일인지 되묻기 (후보: 병원 예약, 은행 서류)',
    checks: [K.status, K.askNoCard, K.twoTodos, K.askClear],
    failChecks: [1, 2],
    passReply: '어떤 걸 계획에 넣을까요?\n[선택지] 병원 예약 · 은행 서류',
    failReply: '병원 예약을 내일 계획으로 옮겨 둘게요.\n[카드] 병원 예약 → 11/5',
    failReason: '어떤 할 일인지 묻지 않고 병원 예약을 계획으로 옮겼어요.',
  },
  {
    id: 'C018',
    message: '운동은 계획으로 옮기고 금요일 7시로 해줘',
    features: ['move'],
    changes: 'one',
    target: 'existing',
    info: 'in_message',
    previousMessages: 2,
    list: { todos: 9, plans: 5 },
    expected: '운동 할 일을 11/6 금요일 오후 7시 계획으로 옮기기',
    checks: [K.status, K.target, K.moveCard, K.dateTime, K.keepSubtasks, K.replyShort],
    failChecks: [3],
    passReply: '운동을 11월 6일 금요일 오후 7시 계획으로 옮겨 둘게요.\n[카드] 운동 → 11/6 19:00',
    failReply: '운동을 11월 6일 금요일 7시 계획으로 옮겨 둘게요.\n[카드] 운동 → 11/6 07:00',
    failReason: '금요일 7시를 오전 7시로 넣었어요.',
  },
  {
    id: 'C020',
    message: '내일 할 거 정리해줘',
    features: ['query'],
    changes: 'none',
    target: 'existing',
    info: 'ask',
    previousMessages: 0,
    list: { todos: 4, plans: 3 },
    expected: '내일 계획을 보여 주고 어떻게 정리할지 되묻기',
    checks: [K.status, K.noChange, K.askNoCard, K.askClear],
    failChecks: [1, 2],
    passReply: '내일은 계획이 3개 있어요. 시간순으로 볼까요, 급한 순으로 볼까요?\n[선택지] 시간순 · 급한 순',
    failReply: '내일 계획을 급한 순으로 바꿔 둘게요.\n[카드] 계획 순서 바꾸기',
    failReason: '어떻게 정리할지 묻지 않고 내일 계획 순서를 바꾸는 카드를 냈어요.',
  },
  {
    id: 'C023',
    message: '아까 그거 지워줘',
    features: ['todo_delete'],
    changes: 'one',
    target: 'existing',
    info: 'from_context',
    previousMessages: 8,
    list: { todos: 10, plans: 6 },
    expected: "앞에서 말한 '서류 출력' 할 일 지우기",
    checks: [K.status, K.target, K.deleteCard, K.replyShort],
    failChecks: [1],
    passReply: '서류 출력을 지울게요.\n[카드] 서류 출력 삭제',
    failReply: '서류 정리를 지울게요.\n[카드] 서류 정리 삭제',
    failReason: "앞에서 말한 '서류 출력' 대신 '서류 정리'를 지웠어요.",
  },
  {
    id: 'C025',
    message: '그 회의 몇 시로 할까',
    features: ['plan_update'],
    changes: 'one',
    target: 'existing',
    info: 'ask',
    previousMessages: 4,
    list: { todos: 8, plans: 7 },
    expected: '어떤 회의인지 되묻기 (후보: 주간 회의, 디자인 리뷰)',
    checks: [K.status, K.noPlanChange, K.askNoCard, K.twoPlans, K.askClear],
    failChecks: [1, 2],
    passReply: '어떤 회의 말씀이세요?\n[선택지] 주간 회의 · 디자인 리뷰',
    failReply: '주간 회의를 오후 2시로 옮겨 둘게요.\n[카드] 주간 회의 · 11/5 14:00',
    failReason: '어떤 회의인지 모르는데 주간 회의를 오후 2시로 옮기는 카드를 냈어요.',
  },
  {
    id: 'C027',
    message: '다음 주에 여행 가는데 준비할 거 넣어줘',
    features: ['todo_create'],
    changes: 'few',
    target: 'new',
    info: 'ask',
    previousMessages: 0,
    list: { todos: 3, plans: 2 },
    expected: '어디로 며칠 가는지 되묻기',
    checks: [K.status, K.askNoCard, K.oneQuestion, K.askClear],
    failChecks: [1],
    passReply: '어디로 며칠 가세요? 그에 맞춰 준비할 걸 골라 드릴게요.',
    failReply: '여행 준비 할 일을 넣어 둘게요.\n[카드] 짐 싸기 · 숙소 확인 · 환전 · 여권 확인',
    failReason: '어디로 가는지 묻지 않고 준비 할 일 4개를 바로 넣었어요.',
  },
  {
    id: 'C030',
    message: '회의록 정리하는 거 할 일로 넣어줘',
    features: ['todo_create'],
    changes: 'one',
    target: 'new',
    info: 'in_message',
    previousMessages: 1,
    list: { todos: 5, plans: 3 },
    expected: "'회의록 정리' 할 일 추가",
    checks: [K.status, K.todoKind, K.userTitle, K.replyShort],
    failChecks: [2],
    passReply: '회의록 정리를 할 일에 넣어 둘게요.\n[카드] 회의록 정리',
    failReply: '할 일에 넣어 둘게요.\n[카드] 주간 회의 내용 문서화',
    failReason: "제목을 '주간 회의 내용 문서화'로 바꿔 썼어요.",
  },
  {
    id: 'C031',
    message: '그거 다음 주로 미뤄줘',
    features: ['plan_update'],
    changes: 'one',
    target: 'existing',
    info: 'ask',
    previousMessages: 16,
    list: { todos: 14, plans: 9 },
    expected: '어떤 계획인지 되묻기 (후보: 발표 리허설, 발표 자료 제출)',
    checks: [K.status, K.noPlanChange, K.askNoCard, K.twoPlans, K.askClear],
    failChecks: [1, 2, 3],
    passReply: '어떤 걸 말씀하시는 거예요? 이번 주에 있는 발표 리허설이랑 발표 자료 제출 중에서 다음 주로 옮길 걸 골라 주세요.\n[선택지] 발표 리허설 · 발표 자료 제출',
    failReply: '다음 주 월요일로 미뤄 둘게요!\n[카드] 발표 리허설 · 10/30 → 11/3',
    failReason: '“그거”가 어떤 계획인지 모르는데 가장 최근 계획을 골라 날짜를 바꾸는 카드를 냈어요.',
  },
  {
    id: 'C033',
    message: '알림 좀 맞춰줘',
    features: ['plan_update'],
    changes: 'one',
    target: 'existing',
    info: 'ask',
    previousMessages: 0,
    list: { todos: 6, plans: 8 },
    expected: '어떤 계획의 알림을 언제로 맞출지 되묻기',
    checks: [K.status, K.noPlanChange, K.askNoCard, K.askClear],
    failChecks: [1, 2],
    passReply: '어떤 계획의 알림을 맞출까요?\n[선택지] 치과 예약 · 팀 회의 · 운동',
    failReply: '계획 8개에 30분 전 알림을 넣어 둘게요.\n[카드] 알림 8개',
    failReason: '묻지 않고 모든 계획에 30분 전 알림을 넣었어요.',
  },
  {
    id: 'C036',
    message: '시험 공부 계획 세워줘',
    features: ['plan_create'],
    changes: 'many',
    target: 'new',
    info: 'ask',
    previousMessages: 0,
    list: { todos: 3, plans: 1 },
    expected: '시험 날짜와 과목을 되묻기',
    checks: [K.status, K.askNoCard, K.oneQuestion, K.options, K.noPlanCreate, K.askClear, K.replyShort],
    failChecks: [1, 4],
    passReply: '시험이 언제예요?\n[선택지] 이번 주 · 다음 주 · 2주 뒤',
    failReply: '이번 주에 공부 계획 5개를 넣어 둘게요.\n[카드] 수학 · 영어 · 국어 · 과학 · 복습',
    failReason: '시험 날짜를 묻지 않고 이번 주에 공부 계획 5개를 만들었어요.',
  },
  {
    id: 'C038',
    message: '이거 나중에 할래',
    features: ['plan_update'],
    changes: 'one',
    target: 'existing',
    info: 'ask',
    previousMessages: 2,
    list: { todos: 8, plans: 6 },
    expected: '어떤 계획을 언제로 미룰지 되묻기',
    checks: [K.status, K.noPlanChange, K.askNoCard, K.askClear],
    failChecks: [1, 2],
    passReply: '어떤 걸 미룰까요?\n[선택지] 보고서 초안 · 장보기',
    failReply: '보고서 초안을 내일로 미뤄 둘게요.\n[카드] 보고서 초안 → 11/5',
    failReason: '어떤 계획인지 묻지 않고 보고서 초안을 내일로 옮겼어요.',
  },
  {
    id: 'C042',
    message: '오늘 뭐부터 하면 좋을까?',
    features: ['briefing'],
    changes: 'none',
    target: 'existing',
    info: 'in_message',
    previousMessages: 0,
    list: { todos: 9, plans: 5 },
    expected: '오늘 브리핑 카드로 순서 잡아 주기',
    checks: [K.status, K.briefingCard, K.briefingOrder],
    failChecks: [2],
    passReply: '오늘은 보고서 초안부터 시작해 보세요.\n[브리핑] 보고서 초안 → 팀 회의 → 장보기',
    failReply: '오늘 할 일을 정리해 봤어요.\n[브리핑] 장보기 → 보고서 초안 → 팀 회의',
    failReason: '마감이 오늘인 보고서 초안보다 장보기를 먼저 놓았어요.',
  },
  {
    id: 'C045',
    message: '그 발표 자료 언제까지였지?',
    features: ['query'],
    changes: 'none',
    target: 'existing',
    info: 'from_context',
    previousMessages: 3,
    list: { todos: 14, plans: 9 },
    expected: '발표 자료 제출 마감(11/7 금요일) 알려 주기',
    checks: [K.status, K.noChange, K.answerFact],
    failChecks: [2],
    passReply: '발표 자료 제출은 11월 7일 금요일까지예요.',
    failReply: '발표 자료는 11월 6일 목요일까지예요.',
    failReason: '발표 리허설 날짜를 마감일로 알려 줬어요.',
  },
  {
    id: 'C047',
    message: '발표 준비 언제 하지?',
    features: ['plan_create'],
    changes: 'one',
    target: 'new',
    info: 'ask',
    previousMessages: 5,
    list: { todos: 7, plans: 6 },
    expected: '비어 있는 시간 후보를 선택지로 되묻기',
    checks: [K.status, K.askNoCard, K.options, K.askClear],
    failChecks: [1],
    passReply: '발표 준비는 언제가 좋을까요?\n[선택지] 오늘 오후 · 내일 오전 · 금요일 오후',
    failReply: '내일 오전 9시에 발표 준비를 넣어 둘게요.\n[카드] 발표 준비 · 11/5 09:00',
    failReason: '언제 할지 묻지 않고 내일 오전 9시로 계획을 만들었어요.',
  },
];

const FEATURES = CATEGORIES.find((c) => c.key === 'feature')!.values.map((x) => x.id);

export const SAMPLE_SET: TestSet = {
  cases: CASES.map(({ failChecks: _f, passReply: _p, failReply: _r, failReason: _e, ...c }) => c),
  qualityExamples: FEATURES.flatMap((feature) => ([1, 2, 3] as const).map((level): QualityExample => ({ feature, level }))),
};

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

/**
 * 실행 하나의 시도를 모두 만든다. 반복마다 케이스를 돌고, 케이스마다 설정을 번갈아 부른다.
 * 시도는 startedAt부터 stepMs 간격으로 끝난다.
 */
export function planAttempts(seed: number, configs: TestConfig[], repeats: number, caseIds: string[], startedAt: number, stepMs: number, turnIds: string[]): PlannedAttempt[] {
  const rand = random(seed);
  const jitter = (base: number, ratio: number) => base * (1 - ratio + rand() * ratio * 2);
  const byId = new Map(CASES.map((c) => [c.id, c]));
  const out: PlannedAttempt[] = [];
  for (let repeat = 1; repeat <= repeats; repeat += 1) {
    for (const id of caseIds) {
      const c = byId.get(id);
      if (!c) continue;
      configs.forEach((config, i) => {
        const passed = rand() < passChance(c, config);
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
          checks: c.checks.map((_, k) => passed || !c.failChecks.includes(k)),
          reason: passed ? PASS_REASON[quality!] : c.failReason,
          reply: passed ? c.passReply : c.failReply,
          turnId: turnIds.length ? turnIds[index % turnIds.length]! : null,
        });
      });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}
