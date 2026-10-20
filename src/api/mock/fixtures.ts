// 예시 데이터: 승인된 프로토타입의 11개 케이스 × 4회 = 44건을 API 응답 모양으로 옮기고,
// 서버 시드처럼 실제 요청 4건, 응답 오류(error) 상태를 보여줄 실제 요청 2건을 더한다(모두 50건).
import type {
  AgentStep,
  ChatInput,
  ChatResponse,
  ChatView,
  ErrorResponse,
  GoalDetail,
  HistoryMessage,
  JsonObject,
  MutationResult,
  NoteState,
  OperationResult,
  Proposal,
  ProposalChange,
  RunDetailResponse,
  RunPath,
  RunStatus,
  ToolKind,
} from '../types';

const PRICE = { input: 2.0, cached: 0.2, output: 8.0 };
const MOCK_MODEL = 'mock-model';

const TOOL_KIND: Record<string, ToolKind> = {
  search_goals: 'query',
  get_goal: 'query',
  get_change_history: 'query',
  get_proposals: 'query',
  create_goal: 'mutation',
  update_goal_details: 'mutation',
  create_proposal: 'mutation',
  apply_proposal: 'mutation',
  set_completion: 'mutation',
  set_schedule: 'mutation',
  set_reminder: 'mutation',
  // set_schedule·set_reminder로 바뀌기 전의 이름. 예전 실행 기록에는 남아 있다.
  set_goal_reminder: 'mutation',
  clear_goal_reminder: 'mutation',
};

interface ModelSrc {
  k: 'model';
  input: number;
  cached: number;
  output: number;
  reasoning: number;
  ms: number;
  summary: string;
  next: string;
}
interface ToolSrc {
  k: 'tool';
  tool: string;
  ms: number;
  status: string;
  args: JsonObject;
  result: JsonObject;
  error: { code: string; message: string } | null;
}
interface ServerSrc {
  k: 'server';
  decision: 'accept_direct' | 'reject_direct' | 'mutation_blocked';
  text: string;
  ms: number;
  blocked?: { tool: string; args: JsonObject; code: string };
}
/** 프로토타입의 "모델 답변 대신 오류 메시지" 표시. API에서는 단계가 아니라 run.message_replaced다. */
interface SwapSrc {
  k: 'swap';
}
type StepSrc = ModelSrc | ToolSrc | ServerSrc | SwapSrc;

function M(input: number, cached: number, output: number, reasoning: number, ms: number, summary: string, next: string): ModelSrc {
  return { k: 'model', input, cached, output, reasoning, ms, summary, next: next === 'final' ? 'final_answer' : next };
}
function T(tool: string, ms: number, status: string, args: JsonObject, result: JsonObject, error?: { code: string; message: string }): ToolSrc {
  return { k: 'tool', tool, ms, status, args, result, error: error ?? null };
}
function S(decision: ServerSrc['decision'], text: string, ms = 6, blocked?: ServerSrc['blocked']): ServerSrc {
  return { k: 'server', decision, text, ms, blocked };
}
const FAIL_SWAP: SwapSrc = { k: 'swap' };

const CAT_ORDER = ['start', 'sustain', 'finish'] as const;
type Cat = (typeof CAT_ORDER)[number];

interface PItem {
  key?: string;
  id?: string;
  title: string;
  criteria?: string;
  /** 사용자가 직접 만든 과제는 역할(category)이 없다. */
  category: Cat | null;
  start_date?: string;
  start_time?: string;
  estimated_minutes?: number;
  status?: 'completed';
  split?: boolean;
}
interface PSrc {
  id: string;
  goal_id: string;
  type: 'initial_roadmap' | 'adjustment';
  created_at: string;
  reason: string;
  goal: { title: string; criteria: string; deadline: string };
  items: PItem[];
  changes: ProposalChange[];
}

/** 제안서 과제의 예정 시작·예상 소요 시간. 정해진 것만 담는다. */
function scheduleOf(it: PItem) {
  return {
    ...(it.start_date ? { start_date: it.start_date } : {}),
    ...(it.start_time ? { start_time: it.start_time } : {}),
    ...(it.estimated_minutes != null ? { estimated_minutes: it.estimated_minutes } : {}),
  };
}

const GOAL_PORTFOLIO = { title: '포트폴리오 공개', criteria: '대표 프로젝트 3개를 공개 페이지에 게시', deadline: '2026-10-31T23:59:00+09:00' };

// 제안서 카드와 create_proposal 인자는 같은 정의에서 만든다(changes와 result_preview가 정확히 같아야 하는 서버 규칙).
const P9_ITEMS: PItem[] = [
  { key: 'c1', title: '공개할 프로젝트 3개 고르기', criteria: '프로젝트 이름 3개를 적어 둠', category: 'start', start_date: '2026-10-20', start_time: '09:00', estimated_minutes: 30 },
  { key: 'c2', title: '프로젝트별 보여줄 내용 적기', category: 'sustain' },
  { key: 'c3', title: '소개 페이지 만들기', category: 'sustain' },
  { key: 'c4', title: '게시한 사이트 확인하기', category: 'finish' },
];
const P9: PSrc = {
  id: 'p-9',
  goal_id: 'g-1',
  type: 'initial_roadmap',
  created_at: '2026-10-18T20:15:00+09:00',
  reason: '아직 과제가 없어서, 목표까지 이어지는 첫 로드맵을 제안해요.',
  goal: GOAL_PORTFOLIO,
  items: P9_ITEMS,
  changes: P9_ITEMS.map((it, i) => ({
    action: 'create_challenge' as const,
    temp_key: it.key!,
    values: { title: it.title, ...(it.criteria ? { completion_criteria: it.criteria } : {}), ...scheduleOf(it), category: it.category!, sort_order: i + 1 },
  })),
};
const P12: PSrc = {
  id: 'p-12',
  goal_id: 'g-1',
  type: 'adjustment',
  created_at: '2026-10-19T11:02:00+09:00',
  reason: "'프로젝트별 보여줄 내용 적기'에 쓰기와 자료 정리가 섞여 있어서 두 과제로 나눠요.",
  goal: GOAL_PORTFOLIO,
  items: [
    { id: 'c-11', title: '공개할 프로젝트 3개 고르기', category: 'start', status: 'completed' },
    { key: 'n1', title: '프로젝트별 핵심 성과 3줄로 적기', category: 'sustain', split: true },
    { key: 'n2', title: '스크린샷과 링크 정리하기', category: 'sustain', split: true },
    { id: 'c-13', title: '소개 페이지 만들기', category: 'sustain' },
    { id: 'c-14', title: '게시한 사이트 확인하기', category: 'finish' },
  ],
  changes: [
    {
      action: 'split_challenge',
      challenge_id: 'c-12',
      replacements: [
        { temp_key: 'n1', values: { title: '프로젝트별 핵심 성과 3줄로 적기', category: 'sustain', sort_order: 2 } },
        { temp_key: 'n2', values: { title: '스크린샷과 링크 정리하기', category: 'sustain', sort_order: 3 } },
      ],
    },
    { action: 'update_challenge', challenge_id: 'c-13', values: { sort_order: 4 } },
    { action: 'update_challenge', challenge_id: 'c-14', values: { sort_order: 5 } },
  ],
};

function previewOf(p: PSrc): JsonObject {
  return {
    goal: { title: p.goal.title, completion_criteria: p.goal.criteria, current_deadline: p.goal.deadline },
    roadmap: p.items.map((it, i) => ({
      reference: (it.id ? { type: 'existing', challenge_id: it.id } : { type: 'new', temp_key: it.key! }) as JsonObject,
      title: it.title,
      ...(it.criteria ? { completion_criteria: it.criteria } : {}),
      ...scheduleOf(it),
      category: it.category,
      sort_order: i + 1,
      status: it.status ?? 'incomplete',
    })),
  };
}
function proposalArgs(p: PSrc): JsonObject {
  return { goal_id: p.goal_id, type: p.type, reason: p.reason, changes: p.changes as unknown as JsonObject[], result_preview: previewOf(p) };
}
function proposalSaved(p: PSrc): JsonObject {
  return { status: 'applied', proposal: { id: p.id, type: p.type, is_applied: false, created_at: p.created_at } };
}
function proposalOf(p: PSrc, applied: boolean): Proposal {
  return {
    id: p.id,
    goal_id: p.goal_id,
    type: p.type,
    reason: p.reason,
    changes: p.changes,
    result_preview: previewOf(p) as unknown as Proposal['result_preview'],
    created_at: p.created_at,
    is_applied: applied,
  };
}

const USER_ID = 'u-1';
const GOAL_DETAIL: Record<string, GoalDetail> = {
  // 로드맵 제안 직후: 아직 과제가 없다.
  T10: {
    goal: {
      id: 'g-1', user_id: USER_ID, title: '포트폴리오 공개', status: 'in_progress', initial_title: '포트폴리오 공개',
      completion_criteria: GOAL_PORTFOLIO.criteria, current_deadline: GOAL_PORTFOLIO.deadline, initial_deadline: GOAL_PORTFOLIO.deadline,
      started_at: '2026-10-12T21:00:00+09:00', adjustment_count: 0, start_date: '2026-10-20', start_time: '09:00',
    },
    challenges: [],
  },
  T20: {
    goal: {
      id: 'g-1', user_id: USER_ID, title: '포트폴리오 공개', status: 'in_progress', initial_title: '포트폴리오 공개',
      completion_criteria: GOAL_PORTFOLIO.criteria, current_deadline: GOAL_PORTFOLIO.deadline, initial_deadline: GOAL_PORTFOLIO.deadline,
      started_at: '2026-10-12T21:00:00+09:00', adjustment_count: 0, start_date: '2026-10-20', start_time: '09:00',
    },
    challenges: P9_ITEMS.map((it, i) => ({
      id: 'c-1' + (i + 1), goal_id: 'g-1', title: it.title, completion_criteria: it.criteria ?? null, category: it.category,
      sort_order: i + 1, origin: 'agent' as const, status: 'incomplete' as const, created_at: '2026-10-19T09:00:00+09:00', ...scheduleOf(it),
    })),
  },
  T24: {
    goal: { id: 'g-3', user_id: USER_ID, title: '토익 850점 받기', status: 'in_progress', initial_title: '토익 850점 받기', started_at: '2026-10-01T10:00:00+09:00', adjustment_count: 0 },
    challenges: [
      { id: 'c-31', goal_id: 'g-3', title: '단어장 1회독', category: 'start', sort_order: 1, origin: 'agent', status: 'completed', created_at: '2026-10-01T10:05:00+09:00', completed_at: '2026-10-19T15:10:00+09:00' },
      { id: 'c-32', goal_id: 'g-3', title: 'LC 파트 2 풀어 보기', category: 'sustain', sort_order: 2, origin: 'agent', status: 'incomplete', created_at: '2026-10-01T10:05:00+09:00' },
      // 사용자가 직접 만든 과제는 역할(category)이 없고, 시간 속성을 직접 정할 수 있다.
      { id: 'c-33', goal_id: 'g-3', title: '모의고사 1회 풀기', description: '실전처럼 시간을 재고 푼다.', category: null, sort_order: 3, origin: 'user', status: 'incomplete', created_at: '2026-10-19T14:20:00+09:00', start_date: '2026-10-24', start_time: '10:00', estimated_minutes: 120, deadline: '2026-10-25T23:59:00+09:00' },
    ],
  },
  T01: {
    goal: { id: 'g-7', user_id: USER_ID, title: '토익 900점 받기', status: 'in_progress', initial_title: '토익 900점 받기', started_at: '2026-10-19T09:30:00+09:00', adjustment_count: 0 },
    challenges: [],
  },
};

type Op = [string, string, string, string];

interface CaseSrc {
  id: string;
  title: string;
  conv: string;
  input: ChatInput;
  path: RunPath;
  status: RunStatus;
  steps: StepSrc[];
  reply: { message: string; options: string[]; views: ('proposal' | 'goal_detail')[]; ops: Op[] };
}

const msg = (text: string): ChatInput => ({ type: 'message', text });

const CASES: CaseSrc[] = [
  { id: 'T10', title: '전체 로드맵과 첫 과제 추천', conv: 'c-portfolio', input: msg('로드맵을 제안해줘.'), path: 'model', status: 'normal',
    steps: [
      M(7400, 5800, 250, 160, 1900, '포트폴리오 목표가 있는지 먼저 확인해야 한다. 목표 이름으로 검색한다.', 'search_goals'),
      T('search_goals', 40, 'success', { query: '포트폴리오' }, { status: 'success', goals: [{ id: 'g-1', title: '포트폴리오 공개', status: 'active' }], next_cursor: null }),
      M(7900, 7200, 180, 110, 1600, '목표가 하나로 특정된다. 기한과 완료 기준이 확정됐는지 상세를 본다.', 'get_goal'),
      T('get_goal', 55, 'success', { goal_id: 'g-1' }, { status: 'success', data: { goal: { id: 'g-1', title: '포트폴리오 공개', current_deadline: '2026-10-31T23:59:00+09:00', completion_criteria: '대표 프로젝트 3개를 공개 페이지에 게시' }, roadmap: [] } }),
      M(8600, 7800, 1550, 450, 4300, "과제가 아직 없으니 initial_roadmap 제안을 만든다. 시작 과제는 부담이 가장 적은 '프로젝트 고르기'로 둔다.", 'create_proposal'),
      T('create_proposal', 120, 'applied', proposalArgs(P9), proposalSaved(P9)),
      M(9900, 8500, 260, 100, 1700, '제안을 저장했지만 아직 반영 전이다. 제안 카드를 보여주고 수락 선택지를 준다.', 'final'),
    ],
    reply: { message: "프로젝트 고르기부터 게시 확인까지 4단계로 제안했어요. 먼저 '공개할 프로젝트 3개 고르기'부터 시작해 보세요.", options: ['제안 수락', '수정하고 싶어요', '지금은 안 할게요'], views: ['proposal', 'goal_detail'], ops: [['create_proposal', 'proposal', 'p-9', 'applied']] } },
  { id: 'T20', title: '제안 수락 시 모델 없이 반영', conv: 'c-portfolio', input: { type: 'proposal_accept', proposal_id: 'p-9' }, path: 'accept_direct', status: 'normal',
    steps: [
      S('accept_direct', '입력이 proposal_accept이고 직전 응답의 제안 p-9와 일치해 수락 근거를 확인함. 모델을 부르지 않고 apply_proposal을 바로 실행', 8),
      T('apply_proposal', 140, 'applied', { proposal_id: 'p-9' }, { status: 'applied', proposal: { id: 'p-9', is_applied: true }, data: { goal: { id: 'g-1', title: '포트폴리오 공개' }, roadmap: '(과제 4개)' } }),
    ],
    reply: { message: '제안을 반영했어요.', options: [], views: ['goal_detail', 'proposal'], ops: [['apply_proposal', 'proposal', 'p-9', 'applied']] } },
  { id: 'T18', title: '제안 거절 시 변경 없이 종료', conv: 'c-room', input: { type: 'proposal_reject', proposal_id: 'p-7' }, path: 'reject_direct', status: 'normal',
    steps: [S('reject_direct', '입력이 proposal_reject라 제안이 있는지만 확인하고 모델·도구 없이 종료', 12)],
    reply: { message: '제안을 반영하지 않았어요.', options: [], views: [], ops: [] } },
  { id: 'T24', title: '명시적인 완료 체크 요청', conv: 'c-toeic', input: msg('토익 단어장 1회독 다 했어, 체크해줘'), path: 'model', status: 'normal',
    steps: [
      M(7300, 5800, 140, 90, 1500, "체크할 과제가 어느 목표에 있는지 모른다. '토익'으로 목표를 찾는다.", 'search_goals'),
      T('search_goals', 38, 'success', { query: '토익' }, { status: 'success', goals: [{ id: 'g-3', title: '토익 850점 받기', status: 'active' }], next_cursor: null }),
      M(7800, 7100, 120, 70, 1400, "목표는 하나다. 로드맵에서 '단어장 1회독' 과제 ID를 확인한다.", 'get_goal'),
      T('get_goal', 52, 'success', { goal_id: 'g-3' }, { status: 'success', data: { goal: { id: 'g-3', title: '토익 850점 받기' }, roadmap: [{ id: 'c-31', title: '단어장 1회독', completed_at: null }, { id: 'c-32', title: 'LC 파트 2 풀어 보기', completed_at: null }] } }),
      M(8500, 7700, 150, 80, 1500, '사용자가 명시적으로 체크를 요청했다. c-31만 완료로 체크한다.', 'set_completion'),
      T('set_completion', 90, 'applied', { target_type: 'challenge', target_id: 'c-31', completed: true }, { status: 'applied', target: { target_type: 'challenge', data: { id: 'c-31', completed_at: '2026-10-19T15:10:00+09:00' } } }),
      M(8900, 8300, 210, 60, 1300, '체크가 반영됐다. 남은 미완료 과제 하나를 다음 행동으로 추천한다.', 'final'),
    ],
    reply: { message: "'단어장 1회독'을 완료로 체크했어요. 다음은 'LC 파트 2 풀어 보기'예요.", options: [], views: ['goal_detail'], ops: [['set_completion', 'challenge', 'c-31', 'applied']] } },
  { id: 'T05', title: '검색 결과가 없는 경우', conv: 'c-health', input: msg('운동 목표 어떻게 돼 가?'), path: 'model', status: 'normal',
    steps: [
      M(7200, 5800, 130, 80, 1400, '운동 관련 목표가 있는지 검색해서 현재 상태를 확인한다.', 'search_goals'),
      T('search_goals', 35, 'success', { query: '운동' }, { status: 'success', goals: [], next_cursor: null }),
      M(7500, 7000, 240, 110, 1700, '검색 결과가 없다. 목표를 만들지 않고 만들지 물어본다.', 'final'),
    ],
    reply: { message: "'운동' 관련 목표를 찾지 못했어요. 새로 만들어 볼까요?", options: ['운동 목표 만들기', '다른 이름으로 찾아줘'], views: [], ops: [] } },
  { id: 'T03', title: '조언만 요청 시 도구 없이 답변', conv: 'c-tips', input: msg('목표 세우는 팁만 알려줘'), path: 'model', status: 'normal',
    steps: [M(7100, 5800, 520, 160, 2600, '조언만 원한다. 목표를 만들거나 조회할 필요가 없으니 바로 답한다.', 'final')],
    reply: { message: "'언제까지, 무엇을 하면 끝인지'가 보이게 적으면 시작하기 쉬워요. 기한을 하나 정하고, 끝났다고 말할 수 있는 기준을 한 줄로 적어 보세요.", options: ['목표 하나 같이 세우기'], views: [], ops: [] } },
  { id: 'T34', title: '저장 실패를 성공으로 말하지 않기', conv: 'c-portfolio', input: msg('포트폴리오 목표 알림 30분 전으로 해줘'), path: 'model', status: 'tool_failed',
    steps: [
      M(7300, 5800, 150, 90, 1500, '알림을 설정할 목표를 찾는다.', 'search_goals'),
      T('search_goals', 41, 'success', { query: '포트폴리오' }, { status: 'success', goals: [{ id: 'g-1', title: '포트폴리오 공개' }], next_cursor: null }),
      M(7800, 7100, 110, 60, 1300, '지금은 목표의 예정 시작 기준 알림만 걸 수 있다. 예정 시작이 있는지 확인한다.', 'get_goal'),
      T('get_goal', 50, 'success', { goal_id: 'g-1' }, { status: 'success', data: { goal: { id: 'g-1', start_date: '2026-10-20', start_time: '09:00', reminder_base: null, reminder_minutes_before: null } } }),
      M(8500, 7700, 160, 90, 1500, '예정 시작이 있다. 사용자가 명시한 30분 전을 시작 기준 알림으로 저장한다.', 'set_reminder'),
      T('set_reminder', 2100, 'failed', { target_type: 'goal', target_id: 'g-1', base: 'start', minutes_before: 30 }, { status: 'failed', error: { code: 'dependency_unavailable', message: '저장소에 연결할 수 없어요.', retryable: true } }, { code: 'dependency_unavailable', message: '저장소에 연결할 수 없어요.' }),
      M(8900, 8300, 190, 70, 1400, '저장에 실패했다. 성공했다고 말하지 않고 다시 시도하도록 안내한다.', 'final'),
      FAIL_SWAP,
    ],
    reply: { message: '저장소에 연결할 수 없어요.', options: [], views: [], ops: [['set_reminder', 'goal', 'g-1', 'failed']] } },
  { id: 'T21', title: '저장 결과 unknown 뒤 추가 변경 차단', conv: 'c-toeic', input: msg('LC 파트 2도 체크하고 토익 알림은 꺼줘'), path: 'model', status: 'outcome_unknown',
    steps: [
      M(7350, 5800, 190, 120, 1600, '두 가지를 요청했다. 먼저 토익 목표와 과제를 찾는다.', 'search_goals'),
      T('search_goals', 39, 'success', { query: '토익' }, { status: 'success', goals: [{ id: 'g-3', title: '토익 850점 받기' }], next_cursor: null }),
      M(7900, 7200, 150, 90, 1500, "목록에서 c-32가 'LC 파트 2 풀어 보기'다. 완료 체크부터 한다.", 'set_completion'),
      T('set_completion', 9000, 'unknown', { target_type: 'challenge', target_id: 'c-32', completed: true }, { status: 'unknown', error: { code: 'outcome_unknown', message: '반영 여부를 확인하지 못했어요. 다시 조회해야 해요.', retryable: true } }, { code: 'outcome_unknown', message: '반영 여부를 확인하지 못했어요. 다시 조회해야 해요.' }),
      M(8300, 7800, 180, 140, 1700, '체크 결과가 unknown이지만 알림 해제도 요청받았다. set_reminder에 minutes_before=null을 보내 해제한다.', 'set_reminder'),
      // 서버는 차단한 변경을 tool 단계가 아니라 막힌 도구 이름·인자를 담은 server 단계 하나로 남긴다.
      S('mutation_blocked', '앞선 set_completion의 반영 여부를 몰라 다음 변경을 막았다.', 1, { tool: 'set_reminder', args: { target_type: 'goal', target_id: 'g-3', base: null, minutes_before: null }, code: 'conflict' }),
      M(8700, 8100, 200, 90, 1500, '알림 해제가 막혔다. 실제 상태를 먼저 확인해야 한다고 안내한다.', 'final'),
      FAIL_SWAP,
    ],
    reply: { message: '반영 여부를 확인하지 못했어요. 다시 조회해야 해요.', options: [], views: [], ops: [['set_completion', 'challenge', 'c-32', 'unknown']] } },
  { id: 'T15', title: '과제 분할과 원본 보존', conv: 'c-portfolio', input: msg('내용 정리 과제를 두 개로 나눠줘'), path: 'model', status: 'normal',
    steps: [
      M(7400, 5800, 160, 100, 1500, "어느 목표의 '내용 정리' 과제인지 찾는다.", 'search_goals'),
      T('search_goals', 40, 'success', { query: '포트폴리오' }, { status: 'success', goals: [{ id: 'g-1', title: '포트폴리오 공개' }], next_cursor: null }),
      M(7900, 7200, 120, 70, 1400, '로드맵에서 분할할 과제를 확인한다.', 'get_goal'),
      T('get_goal', 58, 'success', { goal_id: 'g-1' }, { status: 'success', data: { goal: { id: 'g-1' }, roadmap: [{ id: 'c-11', title: '공개할 프로젝트 3개 고르기', completed_at: '2026-10-15' }, { id: 'c-12', title: '프로젝트별 보여줄 내용 적기', completed_at: null }, { id: 'c-13', title: '소개 페이지 만들기', completed_at: null }, { id: 'c-14', title: '게시한 사이트 확인하기', completed_at: null }] } }),
      M(9800, 7800, 170, 120, 1700, 'c-12가 이전에 어떻게 바뀌었는지 보고 같은 분할을 반복하지 않는다.', 'get_change_history'),
      T('get_change_history', 62, 'success', { goal_id: 'g-1', challenge_id: 'c-12' }, { status: 'success', entries: [{ change_type: 'create', reason: '최초 로드맵', changed_at: '2026-10-12T21:04:00+09:00' }], next_cursor: null }),
      M(10600, 9600, 1900, 620, 5200, '확정된 로드맵이라 adjustment 제안을 만든다. c-12는 삭제로 남기고 새 과제 2개를 split_from으로 잇는다.', 'create_proposal'),
      T('create_proposal', 130, 'applied', proposalArgs(P12), proposalSaved(P12)),
      M(12300, 10500, 300, 110, 1800, '제안만 저장했다. 반영됐다고 말하지 않고 수락을 기다린다.', 'final'),
    ],
    reply: { message: "'프로젝트별 보여줄 내용 적기'를 두 단계로 나누는 제안을 만들었어요.", options: ['제안 수락', '수정하고 싶어요', '지금은 안 할게요'], views: ['proposal'], ops: [['create_proposal', 'proposal', 'p-12', 'applied']] } },
  { id: 'T01', title: '목표만 추가 요청', conv: 'c-toeic2', input: msg('토익 900점 목표 하나 추가해줘'), path: 'model', status: 'normal',
    steps: [
      M(7200, 5800, 210, 90, 1600, '목표 추가만 요청했다. 제목만 확정하고 나머지 상세는 미확정으로 둔다.', 'create_goal'),
      T('create_goal', 85, 'applied', { title: '토익 900점 받기' }, { status: 'applied', goal: { id: 'g-7', title: '토익 900점 받기', current_deadline: null, completion_criteria: null } }),
      M(7700, 7000, 230, 80, 1500, '요청 범위는 여기까지다. 다음 단계는 선택지로만 제시한다.', 'final'),
    ],
    reply: { message: "'토익 900점 받기' 목표를 추가했어요. 기한과 완료 기준은 비워 뒀어요.", options: ['기한 정하기', '로드맵도 같이 세우기', '이대로 둘게요'], views: ['goal_detail'], ops: [['create_goal', 'goal', 'g-7', 'applied']] } },
  { id: 'T19', title: '이전 제안과 반영 여부 조회', conv: 'c-portfolio', input: msg('지난번에 받은 제안 반영됐어?'), path: 'model', status: 'normal',
    steps: [
      M(7300, 5800, 150, 90, 1400, '어느 목표의 제안인지 찾는다.', 'search_goals'),
      T('search_goals', 37, 'success', { query: '포트폴리오' }, { status: 'success', goals: [{ id: 'g-1', title: '포트폴리오 공개' }], next_cursor: null }),
      M(7800, 7100, 130, 70, 1300, '대화에 남은 목록을 믿지 말고 저장된 제안의 반영 여부를 조회한다.', 'get_proposals'),
      T('get_proposals', 48, 'success', { goal_id: 'g-1' }, { status: 'success', proposals: [{ id: 'p-12', type: 'adjustment', is_applied: false, created_at: '2026-10-19T11:02:00+09:00' }, { id: 'p-9', type: 'initial_roadmap', is_applied: true, created_at: '2026-10-18T20:15:00+09:00' }], next_cursor: null }),
      M(8600, 7700, 280, 120, 1600, '최근 제안 p-12는 아직 반영 전이고 p-9는 반영됐다. 둘을 구분해 답한다.', 'final'),
    ],
    reply: { message: '첫 로드맵 제안은 반영됐고, 오늘 받은 과제 분할 제안은 아직 반영 전이에요.', options: ['분할 제안 보기', '지금은 괜찮아요'], views: ['proposal'], ops: [] } },
];

// 이전 대화는 서버가 같은 대화의 앞선 턴으로 다시 만든 값이다. 사용자 발화 앞에는 그 턴의 날짜가 붙고,
// 제안 버튼 턴은 `[제안 수락: 제목]`으로 적히며, 끝나지 않은 턴은 사용자 발화만 남는다.
type H = [('u' | 'a'), string];
const PORTFOLIO_SETUP: H[] = [
  ['u', '[2026-10-12] 포트폴리오 공개를 목표로 추가해줘'],
  ['a', "'포트폴리오 공개' 목표를 추가했어요. 기한은 언제로 할까요?"],
  ['u', '[2026-10-12] 10월 31일까지. 대표 프로젝트 3개를 게시하면 끝이야'],
  ['a', '기한과 완료 기준을 저장했어요. 이어서 로드맵을 만들어 볼까요?'],
];
const TOEIC_START: H[] = [
  ['u', '[2026-10-17] 토익 목표 다음에 뭐 하면 돼?'],
  ['a', "'단어장 1회독'부터 해 보세요. 하루 30분이면 충분해요."],
];
const HIST: Record<string, H[]> = {
  T10: PORTFOLIO_SETUP,
  T20: PORTFOLIO_SETUP.concat([
    ['u', '[2026-10-18] 로드맵을 제안해줘.'],
    ['a', "프로젝트 고르기부터 게시 확인까지 4단계로 제안했어요. 먼저 '공개할 프로젝트 3개 고르기'부터 시작해 보세요."],
  ]),
  T18: [
    ['u', '[2026-10-16] 방 정리 목표가 너무 진행이 안 돼'],
    ['a', '어디서 막히는지 알려 주시면 과제를 조정해 볼게요.'],
    ['u', '[2026-10-17] 공간별로 다시 나눠줘'],
    ['a', '책상, 옷장, 침대 주변 세 단계로 나누는 제안을 만들었어요.'],
  ],
  T24: TOEIC_START,
  T34: [
    ['u', '[2026-10-18] 포트폴리오 진행 상황 알려줘'],
    ['a', "과제 4개 중 1개를 마쳤어요. 다음은 '프로젝트별 보여줄 내용 적기'예요."],
    ['u', '[2026-10-19] 시작 전에 알림 받을 수 있어?'],
    ['a', '네, 시작 몇 분 전에 알려 드릴지 정해 주세요.'],
  ],
  T21: TOEIC_START.concat([
    ['u', '[2026-10-19] 토익 단어장 1회독 다 했어, 체크해줘'],
    ['a', "'단어장 1회독'을 완료로 체크했어요. 다음은 'LC 파트 2 풀어 보기'예요."],
  ]),
  // 마지막 사용자 발화는 응답을 만들지 못하고 끝난 턴이라 탱글 발화가 없다.
  T15: [
    ['u', '[2026-10-18] 포트폴리오 다음 할 일 뭐야?'],
    ['a', "'프로젝트별 보여줄 내용 적기'예요."],
    ['u', '[2026-10-18] 이거 너무 막막해'],
    ['a', '어떤 부분이 막막한지 알려 주시면 더 작게 나눠 볼게요.'],
    ['u', '[2026-10-19] 뭘 써야 할지 정하는 거랑 자료 모으는 게 섞여 있어'],
  ],
  // 제안 버튼 턴은 사용자가 누른 버튼과 제안의 목표 제목으로 적힌다.
  T19: [
    ['u', '[2026-10-18] [제안 수락: 포트폴리오 공개]'],
    ['a', '제안을 반영했어요.'],
    ['u', '[2026-10-19] 포트폴리오 로드맵 다시 보고 싶어'],
    ['a', '지금 로드맵은 4단계예요. 첫 과제는 마쳤어요.'],
    ['u', '[2026-10-19] 조금 전에 받은 제안이 뭐였더라'],
    ['a', '과제 분할 제안이었어요. 반영할지는 아직 정하지 않으셨어요.'],
  ],
};
// 응답의 proposal 화면이 보여줄 제안서와 반영 여부.
const CARD: Record<string, [PSrc, boolean]> = { T10: [P9, false], T20: [P9, true], T15: [P12, false], T19: [P12, false] };

// 앱이 요청에 사용자 변경을 함께 실었을 때만 응답에 변경별 결과(mutation_results)가 있다.
const MUTATION_RESULTS: Record<string, MutationResult[]> = {
  T24: [
    { mutation_id: '5b0e7c1a-2d4f-4e6a-9c31-0a8f6d2e4b71', status: 'applied' },
    { mutation_id: '9e2a4f60-7b13-4c85-a1d9-3f5c8e0b6a42', status: 'unchanged' },
  ],
  T21: [
    { mutation_id: 'c4d81f35-0a96-4b27-8e53-6d1b9a7f2c08', status: 'superseded' },
    {
      mutation_id: '2f7a9d14-e5c3-4086-b1a2-84d6c0e93f57',
      status: 'rejected',
      error: { code: 'unsupported_operation', message: '지금은 목표의 시작 시각 기준 알림만 설정할 수 있어요.', retryable: false },
    },
  ],
};

// 응답이 함께 돌려주는 목표의 최신 상태(note_states). [GOAL_DETAIL 키, 목표 버전]
const NOTE_STATES: Record<string, [string, number]> = { T01: ['T01', 1], T20: ['T20', 3], T24: ['T24', 7], T21: ['T24', 7] };

function noteStatesOf(caseId: string): NoteState[] {
  const src = NOTE_STATES[caseId];
  const detail = src ? GOAL_DETAIL[src[0]] : undefined;
  return src && detail ? [{ goal: detail.goal, challenges: detail.challenges, revision: src[1] }] : [];
}

const TF = [1.0, 0.94, 1.08, 1.03];
const DF = [1.0, 1.15, 0.9, 1.3];

const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

function costOf(input: number, cached: number, output: number): number {
  return ((input - cached) * PRICE.input + cached * PRICE.cached + output * PRICE.output) / 1e6;
}

const toHistory = (h: H[]): HistoryMessage[] => h.map(([r, text]) => ({ role: r === 'u' ? 'user' : 'assistant', text }));

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function hex8(i: number): string {
  return ((Math.imul(i + 1, 2654435761) >>> 0).toString(16)).padStart(8, '0');
}

interface BuiltSteps {
  steps: AgentStep[];
  ms: number;
  replaced: boolean;
}

function buildSteps(src: StepSrc[], startMs: number, tf: number, df: number): BuiltSteps {
  const steps: AgentStep[] = [];
  let at = startMs;
  let replaced = false;
  for (const s of src) {
    if (s.k === 'swap') {
      // 대체 판단도 프로토타입처럼 2ms를 쓴 것으로 친다.
      replaced = true;
      at += Math.max(1, Math.round(2 * df));
      continue;
    }
    const seq = steps.length + 1;
    const ms = Math.max(1, Math.round(s.ms * df));
    const base = { seq, kind: s.k, started_at: iso(at), duration_ms: ms } as const;
    if (s.k === 'model') {
      const input = Math.round(s.input * tf);
      const cached = Math.min(input, Math.round(s.cached * tf));
      const output = Math.round(s.output * tf);
      const reasoning = Math.round(s.reasoning * tf);
      steps.push({
        ...base,
        duration_ms: Math.round(s.ms * df),
        input_tokens: input,
        cached_tokens: cached,
        output_tokens: output,
        reasoning_tokens: reasoning,
        cost_usd: round6(costOf(input, cached, output)),
        reasoning_summary: s.summary,
        // 예시 요약은 이미 한국어라 서버처럼 원문을 그대로 번역본으로 둔다.
        reasoning_summary_ko: s.summary,
        next_action: s.next,
      });
    } else if (s.k === 'tool') {
      steps.push({
        ...base,
        tool_name: s.tool,
        tool_kind: TOOL_KIND[s.tool] ?? 'query',
        status: s.status,
        arguments: s.args,
        result: s.result,
        error_code: s.error?.code ?? null,
      });
    } else {
      steps.push({
        ...base,
        decision: s.decision,
        note: s.text,
        ...(s.blocked ? { tool_name: s.blocked.tool, tool_kind: TOOL_KIND[s.blocked.tool] ?? 'mutation', arguments: s.blocked.args, error_code: s.blocked.code } : {}),
      });
    }
    at += steps[steps.length - 1]!.duration_ms;
  }
  return { steps, ms: at - startMs, replaced };
}

function viewsOf(c: CaseSrc): ChatView[] {
  return c.reply.views.map((v): ChatView => {
    if (v === 'proposal') {
      const card = CARD[c.id]!;
      return { type: 'proposal', data: proposalOf(card[0], card[1]) };
    }
    return { type: 'goal_detail', data: GOAL_DETAIL[c.id]! };
  });
}

const ERROR_FOR: Record<string, OperationResult['error']> = {
  failed: { code: 'dependency_unavailable', message: '저장소에 연결할 수 없어요.', retryable: true },
  unknown: { code: 'outcome_unknown', message: '반영 여부를 확인하지 못했어요. 다시 조회해야 해요.', retryable: true },
};

function opsOf(c: CaseSrc): OperationResult[] {
  return c.reply.ops.map(([action, targetType, targetId, status]) => ({
    action: action as OperationResult['action'],
    target_type: targetType as OperationResult['target_type'],
    target_id: targetId,
    status: status as OperationResult['status'],
    ...(ERROR_FOR[status] ? { error: ERROR_FOR[status] } : {}),
  }));
}

function summarizeSteps(steps: AgentStep[]) {
  const models = steps.filter((s) => s.kind === 'model');
  const sum = (f: (s: AgentStep) => number | null | undefined) => models.reduce((a, s) => a + (f(s) ?? 0), 0);
  return {
    model_calls: models.length,
    tool_calls: steps.filter((s) => s.kind === 'tool').length,
    input_tokens: sum((s) => s.input_tokens),
    cached_tokens: sum((s) => s.cached_tokens),
    output_tokens: sum((s) => s.output_tokens),
    reasoning_tokens: sum((s) => s.reasoning_tokens),
    cost_usd: round6(sum((s) => s.cost_usd)),
  };
}

// 서버 규칙: 메시지는 앞 80자, 버튼 입력은 고정 문구.
export function preview(input: ChatInput): string {
  if (input.type === 'proposal_accept') return '제안 수락';
  if (input.type === 'proposal_reject') return '제안 거절';
  return input.text.slice(0, 80);
}

function requestId(i: number): string {
  return hex8(i) + '-7a3e-4b1d-9c2f-' + String(i + 1).padStart(12, '0');
}

function buildCaseRuns(): RunDetailResponse[] {
  const runs: RunDetailResponse[] = [];
  let t = Date.parse('2026-10-19T08:52:13Z');
  let i = 0;
  for (let r = 0; r < 4; r++) {
    CASES.forEach((c, ci) => {
      const tf = TF[(r + ci) % 4]!;
      const df = DF[(r + ci * 2) % 4]!;
      const built = buildSteps(c.steps, t, tf, df);
      const ms = built.ms + 110;
      const hash = hex8(i);
      const response: ChatResponse = {
        turn_id: hash + '-41c2-9b7e-' + hash.slice(0, 4) + 'a0d1',
        message: c.reply.message,
        options: c.reply.options,
        views: viewsOf(c),
        operations: opsOf(c),
        mutation_results: MUTATION_RESULTS[c.id] ?? [],
        note_states: noteStatesOf(c.id),
      };
      runs.push({
        run: {
          request_id: requestId(i),
          test_case_id: c.id,
          path: c.path,
          status: c.status,
          model: built.steps.some((s) => s.kind === 'model') ? MOCK_MODEL : null,
          message_replaced: built.replaced,
          ...summarizeSteps(built.steps),
          started_at: iso(t),
          finished_at: iso(t + ms),
          duration_ms: ms,
          input_preview: preview(c.input),
        },
        input: c.input,
        history: toHistory(HIST[c.id] ?? []),
        response,
        steps: built.steps,
      });
      t -= (8 + ((i * 7) % 6)) * 60000 + ((i * 13) % 50) * 1000;
      i++;
    });
  }
  return runs;
}

interface ErrorRunSrc {
  index: number;
  input: string;
  history: H[];
  steps: StepSrc[];
  response: ErrorResponse | ChatResponse | null;
}

// 응답 오류 상태 예시. 하나는 시간 초과로 답변은 실패했지만 이미 반영된 변경이 있어서 error를 담은 대화 응답,
// 하나는 처리 중 중단돼 응답이 없다. 확인된 결과가 없는 순수 오류 응답(ErrorResponse)은 단위 테스트가 다룬다.
const TIMEOUT_ERROR = { code: 'execution_timeout' as const, message: '처리 시간이 초과됐어요. 반영된 작업은 실행 결과에서 확인해 주세요.', retryable: false };
const ERROR_RUNS: ErrorRunSrc[] = [
  {
    index: 4,
    input: '포트폴리오 시작을 내일 오전 10시로 바꾸고 이번 주 할 일 정리해줘',
    history: [],
    steps: [
      M(7250, 5800, 160, 100, 1500, '시작 시각을 바꿀 목표부터 찾아야 한다.', 'search_goals'),
      T('search_goals', 44, 'success', { query: '포트폴리오' }, { status: 'success', goals: [{ id: 'g-1', title: '포트폴리오 공개' }], next_cursor: null }),
      M(7900, 7200, 140, 80, 1600, '목표가 하나로 특정된다. 사용자가 말한 예정 시작 날짜와 시각만 바꾼다. 마감은 건드리지 않는다.', 'set_schedule'),
      T('set_schedule', 95, 'applied', { target_type: 'goal', target_id: 'g-1', start_date: '2026-10-20', start_time: '10:00' }, { status: 'applied', target: { target_type: 'goal', data: { id: 'g-1', title: '포트폴리오 공개', start_date: '2026-10-20', start_time: '10:00' } } }),
      M(8300, 7800, 150, 90, 28000, '시작 시각이 바뀌었다. 이번 주 할 일을 모으려고 남은 과제를 확인한다.', 'get_goal'),
    ],
    response: {
      turn_id: '5c0ffee1-41c2-9b7e-5c0fa0d1',
      message: TIMEOUT_ERROR.message,
      options: [],
      views: [],
      operations: [{ action: 'set_schedule', target_type: 'goal', target_id: 'g-1', status: 'applied' }],
      mutation_results: [],
      note_states: [{ goal: { ...GOAL_DETAIL['T10']!.goal, start_time: '10:00' }, challenges: [], revision: 4 }],
      error: TIMEOUT_ERROR,
    },
  },
  {
    index: 21,
    input: '토익 목표 기한을 11월 말로 미뤄줘',
    history: TOEIC_START,
    steps: [
      M(7300, 5800, 130, 80, 1400, '기한을 바꿀 목표를 찾는다.', 'search_goals'),
      T('search_goals', 36, 'success', { query: '토익' }, { status: 'success', goals: [{ id: 'g-3', title: '토익 850점 받기' }], next_cursor: null }),
    ],
    response: null,
  },
];

// 테스트 케이스가 아닌 실제 요청 예시 4건. 서버 시드처럼 T10의 흐름을 다른 입력으로 재사용한다.
const REAL_TEXTS = ['오늘 뭐부터 하면 좋을까?', '포트폴리오 진행 상황 알려줘'];
const REAL_AT = [9, 18, 29, 38];

function midpoint(runs: RunDetailResponse[], index: number): number {
  const newer = Date.parse(runs[index - 1]!.run.started_at);
  const older = Date.parse(runs[index]!.run.started_at);
  return Math.round((newer + older) / 2 / 1000) * 1000;
}

function insertRealRuns(runs: RunDetailResponse[]): void {
  const t10 = CASES.find((c) => c.id === 'T10')!;
  REAL_AT.forEach((index, k) => {
    const t = midpoint(runs, index);
    const built = buildSteps(t10.steps, t, TF[k % 4]!, DF[(k + 1) % 4]!);
    const ms = built.ms + 110;
    const input = msg(REAL_TEXTS[k % 2]!);
    const hash = hex8(200 + k);
    runs.splice(index, 0, {
      run: {
        request_id: hash + '-7a3e-4b1d-9c2f-' + String(800 + k).padStart(12, '0'),
        test_case_id: null,
        path: 'model',
        status: 'normal',
        model: MOCK_MODEL,
        message_replaced: false,
        ...summarizeSteps(built.steps),
        started_at: iso(t),
        finished_at: iso(t + ms),
        duration_ms: ms,
        input_preview: preview(input),
      },
      input,
      history: [],
      response: {
        turn_id: hash + '-41c2-9b7e-' + hash.slice(0, 4) + 'a0d1',
        message: t10.reply.message,
        options: t10.reply.options,
        views: viewsOf(t10),
        operations: opsOf(t10),
      },
      steps: built.steps,
    });
  });
}

function buildRuns(): RunDetailResponse[] {
  const runs = buildCaseRuns();
  insertRealRuns(runs);
  ERROR_RUNS.forEach((e, k) => {
    // 이웃한 두 요청 사이 시각에 끼워 넣는다.
    const t = midpoint(runs, e.index);
    const built = buildSteps(e.steps, t, 1, 1);
    const ms = built.ms + 110;
    const input = msg(e.input);
    runs.splice(e.index, 0, {
      run: {
        request_id: 'e' + hex8(100 + k).slice(1) + '-7a3e-4b1d-9c2f-' + String(900 + k).padStart(12, '0'),
        test_case_id: null,
        path: 'model',
        status: 'error',
        model: MOCK_MODEL,
        message_replaced: false,
        ...summarizeSteps(built.steps),
        started_at: iso(t),
        finished_at: iso(t + ms),
        duration_ms: ms,
        input_preview: preview(input),
      },
      input,
      history: toHistory(e.history),
      response: e.response,
      steps: built.steps,
    });
  });
  return runs;
}

/** 최신순으로 정렬된 예시 실행 기록 50건. */
export const MOCK_RUNS: RunDetailResponse[] = buildRuns();
