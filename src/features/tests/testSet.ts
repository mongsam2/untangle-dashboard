// 케이스 파일(testSet.json)을 테스트 탭의 테스트 셋으로 바꾼다.
// 케이스 파일은 테스트 셋 설계 문서의 케이스를 옮긴 것이다. 실행기는 같은 파일로 테스트 계정의 시작 목록·기억·이전 대화를 준비한다.
import file from './testSet.json';
import type { QualityExample, TestCase, TestCheck, TestSet } from './testModel';

/** 시작 목록에 넣는 항목. 파일 안에서는 키로 가리키고, 실행기가 넣을 때 실제 ID를 받는다. */
export interface CaseFileItem {
  kind: 'todo' | 'plan';
  title: string;
  /** 할 일의 예상 시간(분) */
  estimatedMinutes?: number;
  /** 계획 날짜(YYYY-MM-DD) */
  date?: string;
  time?: string | null;
  reminderMinutes?: number | null;
  subtasks?: { title: string; done: boolean }[];
}

export interface CaseFileCase {
  id: string;
  message: string;
  /** 상황과 정답 행동 */
  situation: string;
  features: string[];
  changes: string;
  target: string;
  info: string;
  memory: string;
  /** lists의 키 */
  list: string;
  /** memories의 키 */
  startMemory: string;
  /** conversations의 키. null이면 첫 턴이다. */
  conversation: string | null;
  /** 써야 하는 변경 도구. 빈 문자열이면 변경 도구를 쓰지 않아야 한다. */
  tools: string;
  checks: TestCheck[];
  /** 공통 대본에서 이 케이스만 바꾸는 턴(1부터) */
  conversationTail?: { turn: number; user: string; tangle: string }[];
}

export interface CaseFile {
  version: number;
  /** 요청 시각. '내일'·'이번 주'는 이 시각 기준이다. */
  requestedAt: string;
  timeZone: string;
  items: Record<string, CaseFileItem>;
  lists: Record<string, { name: string; items: string[] }>;
  memories: Record<string, { name: string; conversation: string[]; organizing: string[] }>;
  /** 이전 대화의 공통 대본. 이전 대화는 앞에서부터 turns개 턴을 쓴다. */
  script: { user: string; tangle: string }[];
  conversations: Record<string, { name: string; turns: number }>;
  /** 채점 모델에게 보여 주는 품질 단계 예시 */
  qualityExamples: QualityExample[];
  cases: CaseFileCase[];
}

export const CASE_FILE = file as CaseFile;

function pick<T>(table: Record<string, T>, key: string, what: string, caseId: string): T {
  const x = table[key];
  if (!x) throw new Error(`${caseId}: 케이스 파일에 ${what} '${key}'이(가) 없음`);
  return x;
}

export function toTestCase(f: CaseFile, c: CaseFileCase): TestCase {
  const list = pick(f.lists, c.list, '목록', c.id);
  const kinds = list.items.map((key) => pick(f.items, key, '항목', c.id).kind);
  const memory = pick(f.memories, c.startMemory, '기억', c.id);
  const conversation = c.conversation ? pick(f.conversations, c.conversation, '이전 대화', c.id) : null;
  return {
    id: c.id,
    message: c.message,
    features: c.features,
    changes: c.changes,
    target: c.target,
    info: c.info,
    memory: c.memory,
    previousMessages: conversation?.turns ?? 0,
    list: { todos: kinds.filter((k) => k === 'todo').length, plans: kinds.filter((k) => k === 'plan').length },
    expected: c.situation,
    checks: c.checks,
    setup: {
      list: list.name,
      memory: memory.name,
      memoryLines: memory.conversation.length + memory.organizing.length,
      conversation: conversation?.name ?? null,
      tailChanged: Boolean(c.conversationTail?.length),
    },
  };
}

/** 이전 대화의 한 턴. 탱글 말이 카드·질문 표기면 보이는 말과 표기를 나눈다. */
export interface StartTurn {
  user: string;
  tangle: string;
  /** 대본에 적은 카드·질문 표기. 없으면 null */
  note: string | null;
  /** 공통 대본에서 이 케이스만 바꾼 턴 */
  changed: boolean;
}

/** 케이스의 시작 상태. 실행기가 테스트 계정에 깔아 두는 것과 같다. */
export interface CaseStart {
  conversation: StartTurn[];
  items: CaseFileItem[];
  memory: { conversation: string[]; organizing: string[] };
}

// 대본의 탱글 말 표기. 실행기(seed.py)와 같은 규칙이다.
const CARD_NOTE = /^(?<card>.+카드, [^·]+?) · "(?<answer>.+)"$/;
const QUESTION_NOTE = /^질문 "(?<question>[^"]+)"(?: \([^)]*\))? · 선택지 (?<options>.+)$/;

export function tangleLine(text: string): { tangle: string; note: string | null } {
  const question = QUESTION_NOTE.exec(text)?.groups;
  if (question) return { tangle: question.question!, note: `선택지 ${question.options}` };
  const card = CARD_NOTE.exec(text)?.groups;
  if (card) return { tangle: card.answer!, note: card.card! };
  return { tangle: text, note: null };
}

/** 공통 대본의 앞부분에 이 케이스가 바꾼 턴을 덮어쓴다. 실행기와 같은 순서다. */
export function toCaseStart(f: CaseFile, c: CaseFileCase): CaseStart {
  const turns = c.conversation ? f.script.slice(0, pick(f.conversations, c.conversation, '이전 대화', c.id).turns) : [];
  const tails = new Map((c.conversationTail ?? []).map((t) => [t.turn, t]));
  const memory = pick(f.memories, c.startMemory, '기억', c.id);
  return {
    conversation: turns.map((t, i) => {
      const turn = tails.get(i + 1) ?? t;
      return { user: turn.user, ...tangleLine(turn.tangle), changed: tails.has(i + 1) };
    }),
    items: pick(f.lists, c.list, '목록', c.id).items.map((key) => pick(f.items, key, '항목', c.id)),
    memory: { conversation: memory.conversation, organizing: memory.organizing },
  };
}

const WEEKDAYS = '일월화수목금토';

/** 시작 목록 항목의 부가 정보: 할 일은 예상 시간·하위 작업, 계획은 날짜·시각·알림 */
export function itemDetail(item: CaseFileItem): string {
  if (item.kind === 'plan') {
    const [y, m, d] = (item.date ?? '').split('-').map(Number);
    const date = y && m && d ? `${m}/${d}(${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})` : null;
    return [date && (item.time ? `${date} ${item.time}` : date), item.reminderMinutes != null ? `${item.reminderMinutes}분 전 알림` : null].filter(Boolean).join(' · ');
  }
  const subtasks = item.subtasks ?? [];
  const done = subtasks.filter((x) => x.done).length;
  return [item.estimatedMinutes != null ? `${item.estimatedMinutes}분` : null, subtasks.length ? `하위 작업 ${subtasks.length}개 중 ${done}개 완료` : null].filter(Boolean).join(' · ');
}

const STARTS = new Map(CASE_FILE.cases.map((c) => [c.id, toCaseStart(CASE_FILE, c)]));

/** 케이스 결과에 보이는 시작 상태. 케이스 파일에 없는 케이스면 null이다. */
export function caseStart(id: string): CaseStart | null {
  return STARTS.get(id) ?? null;
}

export const TEST_SET: TestSet = {
  cases: CASE_FILE.cases.map((c) => toTestCase(CASE_FILE, c)),
  qualityExamples: CASE_FILE.qualityExamples,
};
