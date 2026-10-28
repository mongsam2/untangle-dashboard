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

export const TEST_SET: TestSet = {
  cases: CASE_FILE.cases.map((c) => toTestCase(CASE_FILE, c)),
  qualityExamples: CASE_FILE.qualityExamples,
};
