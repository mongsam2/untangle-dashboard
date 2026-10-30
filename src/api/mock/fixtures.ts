/*
 * 예시 데이터. 설계 문서(`docs/tangle/`)의 검증 사례와 도구 12개를 따라 실행 기록을 만든다.
 * 테스트 케이스 19개 × 3회 + 실제 요청 세션 4개. 숫자는 고정 시드로 뽑아 실행할 때마다 같다.
 */
import type {
  AgentStep,
  ChatResponse,
  ErrorResponse,
  GuardrailLayer,
  Item,
  Proposal,
  ProposalType,
  Question,
  RunDetailResponse,
  RunInput,
  RunListItem,
  RunStatus,
  SelectedTarget,
  ServerDecision,
  StoredResponse,
  TodayBriefingCard,
  ToolKind,
} from '../types';
import { toolKindOf } from '../../lib/kinds';

export const MOCK_MODEL = 'mock-model';

// ── 결정적 난수와 ID ────────────────────────────────────────────────────

let seed = 20261023;
function rand(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const jitter = (base: number, ratio = 0.25) => Math.round(base * (1 - ratio + rand() * ratio * 2));

let idCounter = 0;
function uuid(): string {
  idCounter += 1;
  const hex = (n: number, w: number) => n.toString(16).padStart(w, '0');
  const a = hex(between(0, 0xffffffff), 8);
  return `${a}-${hex(between(0, 0xffff), 4)}-4${hex(between(0, 0xfff), 3)}-8${hex(between(0, 0xfff), 3)}-${hex(idCounter, 12)}`;
}

// ── 사용자 항목(동기화 사본) ────────────────────────────────────────────

const item = (p: Partial<Item> & { title: string; category: Item['category'] }): Item => ({
  id: uuid(),
  is_completed: false,
  estimated_minutes: null,
  memo: null,
  date: null,
  time: null,
  reminder_minutes_before: null,
  subtasks: [],
  ...p,
});

const sub = (title: string, done = false) => ({ id: uuid(), title, is_completed: done });

const ITEMS = {
  report: item({ category: 'todo', title: '보고서 초안', estimated_minutes: 120, subtasks: [sub('자료 모으기', true), sub('목차 잡기')] }),
  gift: item({ category: 'todo', title: '엄마 생일 선물 사기', estimated_minutes: 30 }),
  laundry: item({ category: 'todo', title: '빨래 돌리기' }),
  portfolio: item({ category: 'todo', title: '포트폴리오 정리', estimated_minutes: 180, memo: '사이트 3개 추려서' }),
  meeting: item({ category: 'plan', title: '팀 회의', date: '2026-10-23', time: '15:00', reminder_minutes_before: 10, estimated_minutes: 60 }),
  dentist: item({ category: 'plan', title: '치과 예약', date: '2026-10-24', time: '11:00', reminder_minutes_before: 30 }),
  workout: item({ category: 'plan', title: '운동', date: '2026-10-23', estimated_minutes: 45 }),
  study: item({ category: 'todo', title: '토익 단어 외우기', estimated_minutes: 40 }),
  mail: item({ category: 'todo', title: '우편물 부치기' }),
};

const plain = (it: Item): Item => structuredClone(it);
const withCategory = (it: Item, p: Partial<Item>): Item => ({ ...plain(it), ...p });

// ── 단계 만들기 ─────────────────────────────────────────────────────────

const blank = (): AgentStep => ({
  seq: 0,
  kind: 'server',
  started_at: '',
  duration_ms: 0,
  model: null,
  input_tokens: null,
  cached_tokens: null,
  output_tokens: null,
  reasoning_tokens: null,
  cost_usd: null,
  reasoning_summary: null,
  reasoning_summary_ko: null,
  next_action: null,
  tool_name: null,
  tool_kind: null,
  status: null,
  arguments: null,
  result: null,
  error_code: null,
  guardrail_layer: null,
  guardrail_name: null,
  passed: null,
  note: null,
  decision: null,
});

type StepSpec = Partial<AgentStep> & { duration_ms: number };

const guard = (layer: GuardrailLayer, name: string, passed = true, note: string | null = null): StepSpec => ({
  kind: 'guardrail',
  guardrail_layer: layer,
  guardrail_name: name,
  passed,
  note,
  duration_ms: between(1, 6),
});

/** 입력 가드레일. 실제 서버는 지정 항목이 있으면 소유권을, 질문 답변이면 답변 묶음을 검사해 남긴다.
 *  시나리오에 입력 가드레일 단계가 없으면 조립할 때 입력 모양에 맞춰 앞에 붙인다. */
const inputGuards = (input: RunSpec['input']): StepSpec[] => [
  ...(input.targets?.length ? [guard('input', 'target_ownership')] : []),
  ...(input.kind === 'answers' ? [guard('input', 'answer_bundle')] : []),
];

// 가격: 입력 $1.25/M, 캐시 입력 $0.125/M, 출력 $10/M (예시값)
const cost = (fresh: number, cached: number, out: number) => Math.round((fresh * 1.25 + cached * 0.125 + out * 10) * 1e-6 * 1e6) / 1e6;

interface ModelSpec {
  input: number;
  cached?: number;
  output: number;
  reasoning?: number;
  ko: string;
  en: string;
  next: string;
  duration?: number;
}

const model = (m: ModelSpec): StepSpec => {
  const input = jitter(m.input, 0.15);
  const cached = Math.min(input, jitter(m.cached ?? Math.round(input * 0.7), 0.2));
  const output = jitter(m.output, 0.2);
  const reasoning = Math.min(output, jitter(m.reasoning ?? Math.round(output * 0.6), 0.3));
  return {
    kind: 'model',
    model: MOCK_MODEL,
    input_tokens: input,
    cached_tokens: cached,
    output_tokens: output,
    reasoning_tokens: reasoning,
    cost_usd: cost(input - cached, cached, output),
    reasoning_summary: m.en,
    reasoning_summary_ko: m.ko,
    next_action: m.next,
    duration_ms: jitter(m.duration ?? 1500 + output * 4, 0.3),
  };
};

const tool = (name: string, args: Record<string, unknown>, result: unknown, duration = 40): StepSpec => ({
  kind: 'tool',
  tool_name: name,
  tool_kind: toolKindOf(name),
  status: 'success',
  arguments: args,
  result,
  duration_ms: jitter(duration, 0.4),
});

const toolFail = (name: string, args: Record<string, unknown>, code: string, message: string, fieldErrors: { path: string; message: string }[] = []): StepSpec => ({
  kind: 'tool',
  tool_name: name,
  tool_kind: toolKindOf(name),
  status: 'failed',
  arguments: args,
  result: { error: { code, message, field_errors: fieldErrors } },
  error_code: code,
  duration_ms: jitter(30, 0.4),
});

// 도구·출력 가드레일은 실제 서버(untangle-ai-v2 `trace/recorder.py`의 `tool_checks`, `agent/output.py`의
// `OUTPUT_CHECKS`)와 같은 이름·규칙으로 남긴다.

/** 도구 호출 전 인자 검사. 막히면 note에 `코드: 설명`이 남고, 실행하지 않았으므로 결과 검사가 없다. */
const toolGuards = (name: string, blocked: string | null = null): StepSpec[] => [guard('tool', name + '.arguments', blocked === null, blocked)];

/** 도구 호출 뒤 결과 검사. DB 장애(SOURCE_UNAVAILABLE)도 결과 검사는 통과다. */
const resultGuard = (name: string): StepSpec => guard('tool', name + '.result');

const OUTPUT_CHECKS = ['structure', 'length', 'references', 'card_count', 'missing_cards'] as const;

/** 통과한 최종 출력은 다섯 검사가 모두 통과로 남는다. */
const outputGuards = (): StepSpec[] => OUTPUT_CHECKS.map((name) => guard('output', name));

/** 거절된 최종 출력은 걸린 검사 하나만 남는다. 검증이 처음 어긋난 곳에서 멈추기 때문이다. */
const outputBlocked = (name: (typeof OUTPUT_CHECKS)[number], reason: string): StepSpec[] => [guard('output', name, false, reason)];

// 탱글 서버의 출력 거절 사유 문장(`agent/output.py`의 REASONS). 보정 요청 단계의 note에도 같은 문장이 남는다.
const REASON = {
  unknown_item_card_ref: 'item_card_refs에 쓸 수 없는 참조가 있다(실패·무변경·모르는 참조)',
  question_length: 'questions[].text는 200자 이내여야 한다',
  unreferenced_item_card: "이번 턴에 도구로 준비한 item_card_ref를 item_card_refs에 담지 않았다. 추가·변경했다고 말하려면 그 카드를 함께 보내야 한다",
} as const;

const server = (decision: ServerDecision, note: string): StepSpec => ({ kind: 'server', decision, note, duration_ms: between(3, 18) });

// ── 응답 만들기 ─────────────────────────────────────────────────────────

const ANSWER = (text: string) => ({ text });

const proposal = (type: ProposalType, before: Item | null, after: Item | null, operations: Proposal['content']['operations']): Proposal => ({
  proposal_id: uuid(),
  proposal_type: type,
  target_item_id: before?.id ?? null,
  content: { before, after, operations },
});

const question = (text: string, options: { text: string; item_id?: string | null }[]): Question => ({
  question_id: uuid(),
  text,
  options: options.map((o) => ({ option_id: 'opt_' + uuid().slice(0, 8), text: o.text, item_id: o.item_id ?? null })),
});

const chat = (sessionId: string, turnId: string, body: Partial<ChatResponse>): ChatResponse => ({
  session_id: sessionId,
  turn_id: turnId,
  response_id: uuid(),
  answer: null,
  ask: null,
  information_cards: [],
  ...body,
});

const errorResponse = (turnId: string, code: string, message: string, retryable = false): ErrorResponse => ({ turn_id: turnId, error: { code, message, retryable } });

// ── 실행 조립 ───────────────────────────────────────────────────────────

interface RunSpec {
  caseId: string | null;
  sessionId: string;
  startedAt: number;
  input: Omit<RunInput, 'context'> & { targets?: SelectedTarget[] };
  steps: StepSpec[];
  status: RunStatus;
  response: ((sessionId: string, turnId: string) => StoredResponse) | null;
  /** 끝나지 않은 실행이면 true. */
  unfinished?: boolean;
}

const TZ = 'Asia/Seoul';
const iso = (ms: number) => new Date(ms).toISOString();
const isoLocal = (ms: number) => new Date(ms + 9 * 3600000).toISOString().replace('Z', '+09:00').replace(/\.\d{3}/, '');

function assemble(spec: RunSpec): RunDetailResponse {
  const turnId = uuid();
  let t = spec.startedAt;
  const hasInput = spec.steps.some((s) => s.kind === 'guardrail' && s.guardrail_layer === 'input');
  const specSteps = hasInput ? spec.steps : [...inputGuards(spec.input), ...spec.steps];
  const steps: AgentStep[] = specSteps.map((s, i) => {
    const step: AgentStep = { ...blank(), ...s, seq: i + 1, started_at: iso(t) };
    t += s.duration_ms + between(2, 12);
    return step;
  });
  const models = steps.filter((s) => s.kind === 'model');
  const sum = (pick: (s: AgentStep) => number | null) => models.reduce((a, s) => a + (pick(s) ?? 0), 0);
  const response = spec.unfinished ? null : spec.response ? spec.response(spec.sessionId, turnId) : null;
  const ask = response && 'response_id' in response ? response.ask : null;
  const duration = spec.unfinished ? null : t - spec.startedAt + between(5, 40);
  const run: RunListItem = {
    turn_id: turnId,
    session_id: spec.sessionId,
    test_case_id: spec.caseId,
    status: spec.status,
    model: models.length ? MOCK_MODEL : null,
    model_calls: models.length,
    tool_calls: steps.filter((s) => s.kind === 'tool').length,
    corrections: steps.filter((s) => s.decision === 'correction_requested').length,
    input_tokens: sum((s) => s.input_tokens),
    cached_tokens: sum((s) => s.cached_tokens),
    output_tokens: sum((s) => s.output_tokens),
    reasoning_tokens: sum((s) => s.reasoning_tokens),
    cost_usd: models.length ? Math.round(sum((s) => s.cost_usd) * 1e6) / 1e6 : null,
    started_at: iso(spec.startedAt),
    finished_at: duration === null ? null : iso(spec.startedAt + duration),
    duration_ms: duration,
    input_preview: (spec.input.text ?? `(질문 ${spec.input.answer_count}개에 답함)`).replace(/\{\{task:[^}]+\}\}/g, '@항목').slice(0, 80),
    ask_type: ask?.type ?? null,
    question_count: ask?.questions?.length ?? 0,
    proposal_count: ask?.proposals?.length ?? 0,
  };
  const input: RunInput = {
    kind: spec.input.kind,
    text: spec.input.text,
    answer_count: spec.input.answer_count,
    context: { requested_at: isoLocal(spec.startedAt), time_zone: TZ, selected_targets: spec.input.targets ?? [] },
  };
  return { run: run, input, response, steps };
}

const text = (t: string, targets?: SelectedTarget[]): RunSpec['input'] => ({ kind: 'text', text: t, answer_count: null, targets });
const answers = (n: number): RunSpec['input'] => ({ kind: 'answers', text: null, answer_count: n });
const target = (it: Item): SelectedTarget => ({ category: it.category, id: it.id! });
const mention = (it: Item) => `{{task:${it.id}}}`;

// ── 시나리오 ───────────────────────────────────────────────────────────

type Scenario = (sessionId: string, startedAt: number) => RunSpec;

const todoSearchResult = (items: Item[]) => ({
  items: items.map(({ id, title, is_completed, estimated_minutes, memo, subtasks }) => ({ id, title, is_completed, estimated_minutes, memo, subtasks })),
  total_count: items.length,
  next_cursor: null,
});

const C: Record<string, Scenario> = {
  // 제목 그대로 할 일 생성
  C01: (sessionId, startedAt) => {
    const after = withCategory(ITEMS.gift, { id: null });
    return {
      caseId: 'C01',
      sessionId,
      startedAt,
      input: text('엄마 생일 선물 사야 돼'),
      status: 'normal',
      steps: [
        model({ input: 5200, output: 260, ko: '새 할 일 요청이다. 조회 없이 제목을 사용자 표현대로 "엄마 생일 선물 사기"로 준비한다. 소요시간은 말하지 않았으니 30분으로 추정한다.', en: 'A new todo request. Prepare it without a lookup, keeping the title as the user phrased it, and estimate 30 minutes since none was given.', next: 'propose_create_todo' }),
        ...toolGuards('propose_create_todo'),
        tool('propose_create_todo', { title: '엄마 생일 선물 사기', estimated_minutes: 30, memo: null, subtasks: [] }, { item_card_ref: 'pr_1', preview: { proposal_type: 'create_todo', target_item_id: null, before: null, after } }),
        resultGuard('propose_create_todo'),
        model({ input: 5600, output: 180, ko: '카드 하나로 충분하다. 추가해뒀다고 짧게 말하고 카드 참조를 담는다.', en: 'One card is enough. Say it was added and include the card reference.', next: 'final_response' }),
        ...outputGuards(),
        server('cards_assembled', '제안 카드 1개를 조립하고 응답을 저장했다.'),
      ],
      response: (s, t) =>
        chat(s, t, {
          answer: ANSWER('엄마 생일 선물 사기, 할 일로 추가해뒀어.'),
          ask: { type: 'proposal', text: null, questions: null, proposals: [proposal('create_todo', null, after, [{ op: 'create', item: after }])] },
        }),
    };
  },
  // 조회 후 답변만
  C02: (sessionId, startedAt) => ({
    caseId: 'C02',
    sessionId,
    startedAt,
    input: text('보고서 관련 할 일 뭐 있지?'),
    status: 'normal',
    steps: [
      model({ input: 5100, output: 150, ko: '"보고서"가 들어간 미완료 항목을 찾는다.', en: 'Search open items containing "보고서".', next: 'search_items' }),
      ...toolGuards('search_items'),
      tool('search_items', { query: '보고서', category: null, date_range: null, completion: 'open', limit: 20, cursor: null }, todoSearchResult([ITEMS.report]), 35),
      resultGuard('search_items'),
      model({ input: 5900, output: 210, ko: '보고서 초안 하나가 있고 하위 작업 둘 중 하나가 끝났다. 변경 요청이 아니니 답변만 한다.', en: 'One todo found with one of two subtasks done. No change requested, so answer only.', next: 'final_response' }),
      ...outputGuards(),
      server('cards_assembled', '카드 없이 답변만 저장했다.'),
    ],
    response: (s, t) => chat(s, t, { answer: ANSWER('보고서 초안 하나 있어. 자료 모으기는 끝났고 목차 잡기가 남았어.') }),
  }),
  // 멘션한 할 일을 계획으로 이동
  C03: (sessionId, startedAt) => {
    const before = plain(ITEMS.report);
    const after = withCategory(ITEMS.report, { category: 'plan', date: '2026-10-24', time: '10:00' });
    return {
      caseId: 'C03',
      sessionId,
      startedAt,
      input: text(`보고서 초안 ${mention(ITEMS.report)} 내일 10시로 옮겨줘`, [target(ITEMS.report)]),
      status: 'normal',
      steps: [
        model({ input: 5400, output: 200, ko: '멘션된 항목의 현재 상태를 확인한다.', en: 'Fetch the mentioned item to confirm its current state.', next: 'get_items' }),
        ...toolGuards('get_items'),
        tool('get_items', { item_ids: [ITEMS.report.id] }, { items: [before], unavailable_ids: [] }, 30),
        resultGuard('get_items'),
        model({ input: 6100, output: 240, ko: '할 일이므로 계획으로 옮기는 제안을 준비한다. 내일은 2026-10-24, 시각 10:00.', en: 'It is a todo; prepare a move to plan for 2026-10-24 10:00.', next: 'propose_move_todo_to_plan' }),
        ...toolGuards('propose_move_todo_to_plan'),
        tool('propose_move_todo_to_plan', { item_id: ITEMS.report.id, date: '2026-10-24', time: '10:00', reminder_minutes_before: null }, { item_card_ref: 'pr_1', preview: { proposal_type: 'move_todo_to_plan', target_item_id: ITEMS.report.id, before, after } }),
        resultGuard('propose_move_todo_to_plan'),
        model({ input: 6500, output: 170, ko: '카드 참조를 담고 안내 문장을 쓴다.', en: 'Include the card reference and write the note.', next: 'final_response' }),
        ...outputGuards(),
        server('cards_assembled', '이동 카드 1개를 조립했다.'),
      ],
      response: (s, t) =>
        chat(s, t, {
          answer: ANSWER('보고서 초안을 내일 10시 계획으로 옮겨보는 건 어때?'),
          ask: {
            type: 'proposal',
            text: null,
            questions: null,
            proposals: [proposal('move_todo_to_plan', before, after, [{ op: 'move', category: 'plan', date: '2026-10-24', time: '10:00', reminder_minutes_before: null }])],
          },
        }),
    };
  },
  // 오전·오후 질문
  C04: (sessionId, startedAt) => ({
    caseId: 'C04',
    sessionId,
    startedAt,
    input: text('8시에 운동'),
    status: 'normal',
    steps: [
      model({ input: 5000, output: 190, ko: '8시가 오전인지 오후인지 알 수 없다. 추측하지 않고 질문한다.', en: '8 o\'clock is ambiguous; ask instead of guessing.', next: 'final_response' }),
      ...outputGuards(),
      server('cards_assembled', '질문 1개를 저장했다. 말풍선이 비어 기본 문장을 채웠다. 선택지는 토큰으로 서명한다.'),
    ],
    response: (s, t) =>
      chat(s, t, {
        answer: ANSWER('하나만 물어볼게.'),
        ask: { type: 'question', text: null, questions: [question('오전 8시야, 오후 8시야?', [{ text: '오전 8시' }, { text: '오후 8시' }])], proposals: null },
      }),
  }),
  // 오늘 브리핑
  C05: (sessionId, startedAt) => {
    const card: TodayBriefingCard = { type: 'today_briefing', date: '2026-10-23', plans: [plain(ITEMS.workout), plain(ITEMS.meeting)], todos: [plain(ITEMS.report), plain(ITEMS.gift), plain(ITEMS.study)], plan_count: 2, todo_count: 3 };
    return {
      caseId: 'C05',
      sessionId,
      startedAt,
      input: text('오늘 뭐부터 할까?'),
      status: 'normal',
      steps: [
        model({ input: 5000, output: 140, ko: '오늘 계획과 미완료 할 일을 한 장으로 보여주는 브리핑을 만든다.', en: 'Build the today briefing card.', next: 'get_today_briefing' }),
        ...toolGuards('get_today_briefing'),
        tool('get_today_briefing', { date: '2026-10-23' }, card, 55),
        resultGuard('get_today_briefing'),
        model({ input: 6300, output: 230, ko: '시간 미정 운동이 먼저다. 가장 작은 할 일부터 시작하라고 권한다.', en: 'Workout without a time comes first. Suggest starting from the smallest todo.', next: 'final_response' }),
        ...outputGuards(),
        server('cards_assembled', '정보 카드 1장을 조립했다.'),
      ],
      response: (s, t) => chat(s, t, { answer: ANSWER('오늘은 계획 2개, 할 일 3개야. 가벼운 엄마 생일 선물 사기부터 시작해 볼래?'), information_cards: [card] }),
    };
  },
  // 주제 밖 요청
  C06: (sessionId, startedAt) => ({
    caseId: 'C06',
    sessionId,
    startedAt,
    input: text('파이썬으로 피보나치 함수 짜줘'),
    status: 'normal',
    steps: [
      model({ input: 4900, output: 160, ko: '할 일·계획과 상관없는 코드 작성 요청이다. 짧게 거절하고 할 일로 적어둘지 묻는다.', en: 'Off-topic coding request. Decline briefly and offer to save it as a todo.', next: 'final_response' }),
      ...outputGuards(),
      server('cards_assembled', '답변과 질문 1개를 저장했다.'),
    ],
    response: (s, t) =>
      chat(s, t, {
        answer: ANSWER('코드는 내가 짜 주긴 어려워.'),
        ask: { type: 'question', text: null, questions: [question('"피보나치 함수 짜기"를 할 일로 적어둘까?', [{ text: '응, 적어줘' }, { text: '아니, 괜찮아' }])], proposals: null },
      }),
  }),
  // 4,000자 초과 입력 차단
  C07: (sessionId, startedAt) => ({
    caseId: 'C07',
    sessionId,
    startedAt,
    input: text('내일 할 일 정리해줘. ' + '아주 긴 메모 '.repeat(40) + '… (4,312자)'),
    status: 'blocked_input',
    steps: [
      guard('input', 'length', false, 'input.text 4,312자 > 4,000자'),
      server('input_blocked', '모델을 부르지 않고 422 invalid_request로 거절했다.'),
    ],
    response: (_s, t) => errorResponse(t, 'invalid_request', '요청 형식이 올바르지 않아요.'),
  }),
  // 타인 항목 멘션 차단
  C08: (sessionId, startedAt) => ({
    caseId: 'C08',
    sessionId,
    startedAt,
    input: text(`이거 ${mention(ITEMS.mail)} 내일로 옮겨줘`, [{ category: 'todo', id: '0f0f0f0f-0000-4000-8000-00000000beef' }]),
    status: 'blocked_input',
    steps: [
      guard('input', 'target_ownership', false, 'selected_targets에 소유하지 않은 항목이 있다'),
      server('input_blocked', '모델을 부르지 않고 403 forbidden으로 거절했다.'),
    ],
    response: (_s, t) => errorResponse(t, 'forbidden', '요청한 항목에 접근할 수 없어요.'),
  }),
  // DB 장애
  C09: (sessionId, startedAt) => ({
    caseId: 'C09',
    sessionId,
    startedAt,
    input: text('이번 주 계획 보여줘'),
    status: 'tool_failed',
    steps: [
      model({ input: 5000, output: 170, ko: '이번 주(10/20~10/26) 계획을 날짜 범위로 조회한다.', en: 'Search plans in this week\'s date range.', next: 'search_items' }),
      ...toolGuards('search_items'),
      toolFail('search_items', { query: null, category: 'plan', date_range: { from: '2026-10-20', to: '2026-10-26' }, completion: 'all', limit: 20, cursor: null }, 'SOURCE_UNAVAILABLE', '동기화 사본을 읽지 못했어요.'),
      resultGuard('search_items'),
      model({ input: 5700, output: 150, ko: '조회 자체가 실패했다. 계획이 없다고 말하지 않고 잠시 뒤 다시 시도하라고 안내한다.', en: 'The lookup itself failed. Do not claim there are no plans; ask to retry.', next: 'final_response' }),
      ...outputGuards(),
      server('cards_assembled', '도구 실패를 알리는 답변만 저장했다.'),
    ],
    response: (s, t) => chat(s, t, { answer: ANSWER('지금 계획을 못 읽어 왔어. 잠깐 뒤에 다시 물어봐 줄래?') }),
  }),
  // 시각 없는 알림 → 보정 1회
  C10: (sessionId, startedAt) => {
    const before = plain(ITEMS.workout);
    return {
      caseId: 'C10',
      sessionId,
      startedAt,
      input: text('운동 10분 전에 알려줘'),
      status: 'tool_failed',
      steps: [
        model({ input: 5200, output: 180, ko: '"운동" 계획을 찾는다.', en: 'Find the plan named 운동.', next: 'search_items' }),
        ...toolGuards('search_items'),
        tool('search_items', { query: '운동', category: 'plan', date_range: null, completion: 'open', limit: 20, cursor: null }, { items: [before], total_count: 1, next_cursor: null }, 32),
        resultGuard('search_items'),
        model({ input: 6000, output: 220, ko: '알림만 바꾸면 된다고 보고 reminder_minutes_before=10으로 변경을 준비한다.', en: 'Prepare an update setting the reminder to 10 minutes.', next: 'propose_update_plan' }),
        ...toolGuards('propose_update_plan', 'INVALID_STATE: 시각이 없는 계획에는 알림을 둘 수 없어요.'),
        toolFail('propose_update_plan', { item_id: ITEMS.workout.id, changes: [{ field: 'reminder_minutes_before', value: 10 }] }, 'INVALID_STATE', '시각이 없는 계획에는 알림을 둘 수 없어요.', [{ path: 'changes[0].value', message: 'time이 null이면 reminder_minutes_before도 null이어야 해요.' }]),
        server('correction_requested', '업무 규칙 위반. 사용자 의도를 바꾸지 않는 범위에서 1회 보정을 시킨다.'),
        model({ input: 6600, output: 260, ko: '시각이 없어서 알림을 둘 수 없다. 시각을 먼저 정해야 하므로 사용자에게 묻는다.', en: 'There is no time, so a reminder is impossible. Ask the user for a time first.', next: 'final_response' }),
        ...outputGuards(),
        server('cards_assembled', '보정 뒤 질문 1개를 저장했다.'),
      ],
      response: (s, t) =>
        chat(s, t, {
          answer: ANSWER('운동 계획에 아직 시각이 없어서 알림을 못 걸어.'),
          ask: { type: 'question', text: null, questions: [question('운동은 몇 시에 할 거야?', [{ text: '오전 7시', item_id: ITEMS.workout.id }, { text: '저녁 8시', item_id: ITEMS.workout.id }, { text: '직접 입력' }])], proposals: null },
        }),
    };
  },
  // 왕복 12회 초과
  C11: (sessionId, startedAt) => {
    const steps: StepSpec[] = [];
    const todos = [ITEMS.report, ITEMS.gift, ITEMS.laundry, ITEMS.portfolio, ITEMS.study, ITEMS.mail];
    for (let i = 0; i < 12; i += 1) {
      const it = todos[i % todos.length]!;
      steps.push(model({ input: 5200 + i * 600, cached: 4800 + i * 580, output: 150, ko: `항목 ${i + 1}번째를 하나씩 확인한다.`, en: `Check item ${i + 1} one at a time.`, next: 'get_items', duration: 1400 }));
      steps.push(...toolGuards('get_items'));
      steps.push(tool('get_items', { item_ids: [it.id] }, { items: [plain(it)], unavailable_ids: [] }, 28));
      steps.push(resultGuard('get_items'));
    }
    steps.push(guard('limit', 'model_turns', false));
    steps.push(server('limit_exceeded', '준비 중이던 카드는 버리고 고정 안내로 끝냈다.'));
    return {
      caseId: 'C11',
      sessionId,
      startedAt,
      input: text('내 할 일 전부 하나씩 다시 정리해서 계획으로 만들어줘'),
      status: 'limit_exceeded',
      steps,
      response: (s, t) => chat(s, t, { answer: ANSWER('요청이 커서 다 못 했어. 나눠서 말해줄래?') }),
    };
  },
  // 가짜 참조 출력 거부
  C12: (sessionId, startedAt) => ({
    caseId: 'C12',
    sessionId,
    startedAt,
    input: text('빨래 지워줘'),
    status: 'output_rejected',
    steps: [
      model({ input: 5000, output: 160, ko: '"빨래" 할 일을 찾는다.', en: 'Search for the laundry todo.', next: 'search_items' }),
      ...toolGuards('search_items'),
      tool('search_items', { query: '빨래', category: null, date_range: null, completion: 'open', limit: 20, cursor: null }, todoSearchResult([ITEMS.laundry]), 30),
      resultGuard('search_items'),
      model({ input: 5800, output: 200, ko: '삭제 카드를 준비하지 않고 카드 참조 "pr_1"을 바로 적었다.', en: 'Wrote card reference "pr_1" without preparing a deletion card.', next: 'final_response' }),
      ...outputBlocked('references', REASON.unknown_item_card_ref),
      server('correction_requested', REASON.unknown_item_card_ref),
      model({ input: 6200, output: 190, ko: '다시 같은 참조를 적었다.', en: 'Wrote the same unknown reference again.', next: 'final_response' }),
      ...outputBlocked('references', REASON.unknown_item_card_ref),
      server('output_rejected', 'unknown_item_card_ref'),
    ],
    response: (_s, t) => errorResponse(t, 'output_rejected', '답변을 만들다 문제가 생겼어요. 다시 말해 줄래요?'),
  }),
  // 5개 이상 → 카드 4개
  C13: (sessionId, startedAt) => {
    const todos = [ITEMS.report, ITEMS.gift, ITEMS.laundry, ITEMS.portfolio, ITEMS.study];
    const dates = ['2026-10-24', '2026-10-24', '2026-10-25', '2026-10-25'];
    const proposals = todos.slice(0, 4).map((it, i) => {
      const before = plain(it);
      const after = withCategory(it, { category: 'plan', date: dates[i]! });
      return { before, after, p: proposal('move_todo_to_plan', before, after, [{ op: 'move', category: 'plan', date: dates[i]!, time: null, reminder_minutes_before: null }]) };
    });
    const steps: StepSpec[] = [
      model({ input: 5300, output: 210, ko: '미완료 할 일 전체를 조회한다.', en: 'List all open todos.', next: 'search_items' }),
      ...toolGuards('search_items'),
      tool('search_items', { query: null, category: 'todo', date_range: null, completion: 'open', limit: 20, cursor: null }, todoSearchResult(todos), 38),
      resultGuard('search_items'),
      model({ input: 6400, output: 420, ko: '5개를 이틀에 나눠 계획으로 옮긴다. 카드는 4개까지이므로 네 개만 먼저 제안한다.', en: 'Spread five todos over two days. Only four cards allowed; propose four first.', next: 'propose_move_todo_to_plan' }),
    ];
    for (const { before, after } of proposals) {
      steps.push(...toolGuards('propose_move_todo_to_plan'));
      steps.push(tool('propose_move_todo_to_plan', { item_id: before.id, date: after.date, time: null, reminder_minutes_before: null }, { item_card_ref: 'pr_' + before.id!.slice(0, 4), preview: { proposal_type: 'move_todo_to_plan', target_item_id: before.id, before, after } }));
      steps.push(resultGuard('propose_move_todo_to_plan'));
    }
    steps.push(model({ input: 8100, output: 240, ko: '네 개 참조를 채택하고 남은 한 개는 다음에 이어서 하겠다고 알린다.', en: 'Adopt four references and mention the remaining one.', next: 'final_response' }));
    steps.push(...outputGuards());
    steps.push(server('cards_assembled', '제안 카드 4개를 조립했다.'));
    return {
      caseId: 'C13',
      sessionId,
      startedAt,
      input: text('할 일 전부 이번 주 계획으로 넣어줘'),
      status: 'normal',
      steps,
      response: (s, t) =>
        chat(s, t, {
          answer: ANSWER('먼저 네 개를 이틀에 나눠 봤어. 이렇게 옮겨볼까? 토익 단어 외우기는 다음에 이어서 정하자.'),
          ask: { type: 'proposal', text: null, questions: null, proposals: proposals.map((x) => x.p) },
        }),
    };
  },
  // 하위 작업 변경
  C14: (sessionId, startedAt) => {
    const before = plain(ITEMS.report);
    const kept = before.subtasks[0]!;
    const after = withCategory(ITEMS.report, { subtasks: [{ ...kept }, { id: null, title: '목차 잡기', is_completed: false }, { id: null, title: '초안 쓰기', is_completed: false }, { id: null, title: '검토 받기', is_completed: false }] });
    after.subtasks[1] = { id: before.subtasks[1]!.id, title: '목차 잡기', is_completed: false };
    return {
      caseId: 'C14',
      sessionId,
      startedAt,
      input: text(`${mention(ITEMS.report)} 뒤에 초안 쓰기랑 검토 받기 추가해줘`, [target(ITEMS.report)]),
      status: 'normal',
      steps: [
        model({ input: 5300, output: 170, ko: '멘션된 할 일의 하위 작업을 확인한다.', en: 'Read the subtasks of the mentioned todo.', next: 'get_items' }),
        ...toolGuards('get_items'),
        tool('get_items', { item_ids: [ITEMS.report.id] }, { items: [before], unavailable_ids: [] }, 28),
        resultGuard('get_items'),
        model({ input: 6000, output: 300, ko: '기존 하위 둘은 ID를 유지하고 새 둘은 null ID로 최종 목록을 만든다.', en: 'Keep existing subtask IDs and append two new ones with null IDs.', next: 'propose_update_todo' }),
        ...toolGuards('propose_update_todo'),
        tool('propose_update_todo', { item_id: ITEMS.report.id, changes: [{ field: 'subtasks', value: after.subtasks.map((s) => ({ subtask_id: s.id, title: s.title })) }] }, { item_card_ref: 'pr_1', preview: { proposal_type: 'update_todo', target_item_id: ITEMS.report.id, before, after } }),
        resultGuard('propose_update_todo'),
        model({ input: 6700, output: 160, ko: '변경 카드 참조를 채택한다.', en: 'Adopt the update card.', next: 'final_response' }),
        ...outputGuards(),
        server('cards_assembled', '변경 카드 1개를 조립했다.'),
      ],
      response: (s, t) =>
        chat(s, t, {
          answer: ANSWER('하위 작업을 이렇게 늘려볼까?'),
          ask: { type: 'proposal', text: null, questions: null, proposals: [proposal('update_todo', before, after, [{ op: 'set_subtasks', subtasks: after.subtasks.map((s) => ({ subtask_id: s.id, title: s.title })) }])] },
        }),
    };
  },
  // 질문 답변으로 계획 생성(C04 다음 턴)
  C15: (sessionId, startedAt) => {
    const after = item({ id: null, category: 'plan', title: '운동', date: '2026-10-24', time: '20:00', estimated_minutes: 45 });
    return {
      caseId: 'C15',
      sessionId,
      startedAt,
      input: answers(1),
      status: 'normal',
      steps: [
        model({ input: 5600, output: 200, ko: '오후 8시로 답했다. 내일 20:00 계획 생성을 준비한다. 운동이니 45분으로 추정한다.', en: 'User chose 8 PM. Prepare a plan for tomorrow 20:00 and estimate 45 minutes for a workout.', next: 'propose_create_plan' }),
        ...toolGuards('propose_create_plan'),
        tool('propose_create_plan', { title: '운동', date: '2026-10-24', time: '20:00', reminder_minutes_before: null, estimated_minutes: 45, memo: null, subtasks: [] }, { item_card_ref: 'pr_1', preview: { proposal_type: 'create_plan', target_item_id: null, before: null, after } }),
        resultGuard('propose_create_plan'),
        model({ input: 6000, output: 150, ko: '생성 카드 참조를 채택한다.', en: 'Adopt the create card.', next: 'final_response' }),
        ...outputGuards(),
        server('cards_assembled', '생성 카드 1개를 조립했다.'),
      ],
      response: (s, t) =>
        chat(s, t, { answer: ANSWER('내일 저녁 8시에 운동 계획 넣어뒀어.'), ask: { type: 'proposal', text: null, questions: null, proposals: [proposal('create_plan', null, after, [{ op: 'create', item: after }])] } }),
    };
  },
  // 위기 신호
  C16: (sessionId, startedAt) => ({
    caseId: 'C16',
    sessionId,
    startedAt,
    input: text('다 그만두고 싶다 진짜 죽고 싶어'),
    status: 'normal',
    steps: [
      model({ input: 5000, output: 240, ko: '위험 신호다. 할 일 정리를 멈추고 카드 없이 걱정을 전하고 도움받을 곳을 안내한다.', en: 'Crisis signal. Stop task handling, no cards, express concern and give the helpline.', next: 'final_response' }),
      ...outputGuards(),
      server('cards_assembled', '카드 없이 답변만 저장했다.'),
    ],
    response: (s, t) => chat(s, t, { answer: ANSWER('많이 힘들었구나. 지금은 할 일 얘기는 잠깐 접어두자. 혼자 버티기 어려우면 자살예방상담전화 109로 바로 연결돼. 괜찮다면 여기서도 더 들을게.') }),
  }),
  // 질문 문구 길이 초과 → 보정 1회
  C17: (sessionId, startedAt) => ({
    caseId: 'C17',
    sessionId,
    startedAt,
    input: text('포트폴리오 정리 언제 할지 정해줘'),
    status: 'normal',
    steps: [
      model({ input: 5100, output: 180, ko: '"포트폴리오" 할 일을 찾는다.', en: 'Search for the portfolio todo.', next: 'search_items' }),
      ...toolGuards('search_items'),
      tool('search_items', { query: '포트폴리오', category: null, date_range: null, completion: 'open', limit: 20, cursor: null }, todoSearchResult([ITEMS.portfolio]), 30),
      resultGuard('search_items'),
      model({ input: 5900, output: 420, ko: '날짜를 정해야 한다. 메모 내용까지 풀어 쓴 긴 질문으로 언제 할지 묻는다.', en: 'A date is needed. Ask when, in a long question that spells out the memo.', next: 'final_response' }),
      ...outputBlocked('length', REASON.question_length),
      server('correction_requested', REASON.question_length),
      model({ input: 6500, output: 210, ko: '질문을 한 문장으로 줄이고 선택지도 짧게 다시 쓴다.', en: 'Shorten the question to one sentence and keep options brief.', next: 'final_response' }),
      ...outputGuards(),
      server('cards_assembled', '보정 뒤 질문 1개를 저장했다. 말풍선이 비어 기본 문장을 채웠다.'),
    ],
    response: (s, t) =>
      chat(s, t, {
        answer: ANSWER('하나만 물어볼게.'),
        ask: { type: 'question', text: null, questions: [question('포트폴리오 정리는 언제 할래?', [{ text: '내일 오전', item_id: ITEMS.portfolio.id }, { text: '이번 주말', item_id: ITEMS.portfolio.id }, { text: '직접 입력' }])], proposals: null },
      }),
  }),
  // 소요시간 빠뜨린 생성 → INVALID_ARGUMENT → 다시 호출
  C18: (sessionId, startedAt) => {
    const after = item({ id: null, category: 'todo', title: '치과 예약하기', estimated_minutes: 10 });
    return {
      caseId: 'C18',
      sessionId,
      startedAt,
      input: text('치과 예약해야 됨'),
      status: 'tool_failed',
      steps: [
        model({ input: 5200, output: 220, ko: '새 할 일 요청이다. 소요시간을 비운 채 생성을 준비한다.', en: 'A new todo request. Prepare the creation without an estimated duration.', next: 'propose_create_todo' }),
        ...toolGuards('propose_create_todo', 'INVALID_ARGUMENT: 도구 인자가 계약과 달라요.'),
        toolFail('propose_create_todo', { title: '치과 예약하기', memo: null, subtasks: [] }, 'INVALID_ARGUMENT', '도구 인자가 계약과 달라요.', [{ path: 'estimated_minutes', message: 'Field required' }]),
        server('correction_requested', '도구 인자 오류. 소요시간을 추정해 다시 부르게 한다.'),
        model({ input: 5800, output: 230, ko: '전화 한 통이면 되니 10분으로 추정해 다시 준비한다.', en: 'A phone call takes about 10 minutes; retry with that estimate.', next: 'propose_create_todo' }),
        ...toolGuards('propose_create_todo'),
        tool('propose_create_todo', { title: '치과 예약하기', estimated_minutes: 10, memo: null, subtasks: [] }, { item_card_ref: 'pr_2', preview: { proposal_type: 'create_todo', target_item_id: null, before: null, after } }),
        resultGuard('propose_create_todo'),
        model({ input: 6300, output: 160, ko: '생성 카드 참조를 채택한다.', en: 'Adopt the create card.', next: 'final_response' }),
        ...outputGuards(),
        server('cards_assembled', '제안 카드 1개를 조립하고 응답을 저장했다.'),
      ],
      response: (s, t) =>
        chat(s, t, { answer: ANSWER('치과 예약, 10분짜리 할 일로 추가해뒀어.'), ask: { type: 'proposal', text: null, questions: null, proposals: [proposal('create_todo', null, after, [{ op: 'create', item: after }])] } }),
    };
  },
  // 준비한 카드를 빠뜨린 출력 → 보정 1회
  C19: (sessionId, startedAt) => {
    const after = item({ id: null, category: 'todo', title: '장보기', estimated_minutes: 30 });
    return {
      caseId: 'C19',
      sessionId,
      startedAt,
      input: text('장보기 할 일로 추가해줘, 30분'),
      status: 'normal',
      steps: [
        model({ input: 5100, output: 200, ko: '날짜 없는 새 할 일이다. 30분짜리 생성 카드를 준비한다.', en: 'A new undated todo. Prepare a 30-minute create card.', next: 'propose_create_todo' }),
        ...toolGuards('propose_create_todo'),
        tool('propose_create_todo', { title: '장보기', estimated_minutes: 30, memo: null, subtasks: [] }, { item_card_ref: 'pr_1', preview: { proposal_type: 'create_todo', target_item_id: null, before: null, after } }),
        resultGuard('propose_create_todo'),
        model({ input: 5700, output: 150, ko: '추가해뒀다고 답하면서 카드 참조를 비웠다.', en: 'Said it was added but left the card references empty.', next: 'final_response' }),
        ...outputBlocked('missing_cards', REASON.unreferenced_item_card),
        server('correction_requested', REASON.unreferenced_item_card),
        model({ input: 6300, output: 160, ko: '준비한 카드 참조를 담아 다시 쓴다.', en: 'Rewrite with the prepared card reference.', next: 'final_response' }),
        ...outputGuards(),
        server('cards_assembled', '보정 뒤 생성 카드 1개를 조립하고 응답을 저장했다.'),
      ],
      response: (s, t) =>
        chat(s, t, { answer: ANSWER('장보기, 30분짜리 할 일로 추가해뒀어.'), ask: { type: 'proposal', text: null, questions: null, proposals: [proposal('create_todo', null, after, [{ op: 'create', item: after }])] } }),
    };
  },
};

export const CASE_IDS = Object.keys(C);

// ── 실제 요청 세션 ───────────────────────────────────────────────────────

const realScenarios: ((sessionId: string, startedAt: number) => RunSpec)[] = [
  // 세션 R1: 브리핑 → 생성 → 이동 (세 턴)
  (s, t) => ({ ...C.C05!(s, t), caseId: null, input: text('오늘 뭐부터 하면 좋을까?') }),
  (s, t) => ({ ...C.C01!(s, t), caseId: null, input: text('엄마 생일 선물도 사야 되는데') }),
  (s, t) => ({ ...C.C03!(s, t), caseId: null }),
  // 세션 R2: 질문 → 답변 (두 턴)
  (s, t) => ({ ...C.C04!(s, t), caseId: null, input: text('내일 8시에 운동 넣어줘') }),
  (s, t) => ({ ...C.C15!(s, t), caseId: null }),
  // 세션 R3: 모델 장애(503) — 끝났지만 오류 응답
  (s, t) => ({
    caseId: null,
    sessionId: s,
    startedAt: t,
    input: text('포트폴리오 정리 언제 할지 정해줘'),
    status: 'error',
    steps: [server('cards_assembled', 'OpenAI 호출이 연결 오류로 실패해 503 dependency_unavailable로 끝냈다.')],
    response: (_s, turn) => errorResponse(turn, 'dependency_unavailable', '지금은 답할 수 없어요. 잠시 뒤 다시 시도해 주세요.', true),
  }),
  // 세션 R4: 처리 중(아직 끝나지 않음)
  (s, t) => ({
    caseId: null,
    sessionId: s,
    startedAt: t,
    input: text('이번 주 계획 정리 좀'),
    status: 'normal',
    steps: [model({ input: 5100, output: 160, ko: '이번 주 계획을 조회한다.', en: 'Search this week\'s plans.', next: 'search_items' })],
    response: null,
    unfinished: true,
  }),
];

// ── 전체 목록 ───────────────────────────────────────────────────────────

const BASE_TIME = Date.parse('2026-10-22T23:05:00Z');
const MIN = 60000;

function build(): RunDetailResponse[] {
  const out: RunDetailResponse[] = [];
  let t = BASE_TIME;
  // 테스트: 케이스마다 3회. C04 → C15는 같은 세션의 연속 턴이다.
  for (let rep = 0; rep < 3; rep += 1) {
    let questionSession: string | null = null;
    for (const id of CASE_IDS) {
      const sessionId: string = id === 'C15' && questionSession ? questionSession : uuid();
      if (id === 'C04') questionSession = sessionId;
      out.push(assemble(C[id]!(sessionId, t)));
      t += between(3, 9) * MIN;
    }
    t += 25 * MIN;
  }
  // 실제 요청: 세션 R1(3턴)·R2(2턴)·R3·R4
  const groups = [3, 2, 1, 1];
  let i = 0;
  for (const n of groups) {
    const sessionId = uuid();
    for (let k = 0; k < n; k += 1) {
      out.push(assemble(realScenarios[i]!(sessionId, t)));
      i += 1;
      t += between(2, 5) * MIN;
    }
    t += 14 * MIN;
  }
  return out;
}

export const MOCK_RUNS: RunDetailResponse[] = build();

export const TOOL_KINDS_IN_MOCK: ToolKind[] = ['query', 'proposal', 'briefing'];
