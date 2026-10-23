import type { ToolKind } from '../../api/types';
import { TOOLS } from '../../lib/kinds';

/*
 * 구조 탭의 구조도 데이터. 좌표는 2400×1000 캔버스 기준이며 화면에서는 배율만 바꾼다.
 * 글은 설계 문서(untangle-ai-v2 `docs/tangle/`)에서 가장 짧게 추렸고, 자세한 내용은 모듈을 눌러 여는 설명 창에 둔다.
 * 요청은 위 줄로 들어가 AI 모델에 닿고, 응답은 아래 줄로 앱에 돌아온다(U자). 가드레일은 흐름 선 위의 차단봉이다.
 */

export const CANVAS = { width: 2400, height: 1000 };

export type ElementKind = 'node' | 'gate' | 'tool';

export interface Doc {
  /** 설명 창 머리의 작은 글. */
  overline: string;
  title: string;
  /** 한 줄 요약. */
  summary: string;
  /** 본문 항목. 굵은 제목과 한 문장. */
  points: { head: string; body: string }[];
  /** 옆칸 항목. */
  side: { label: string; value: string }[];
  /** 설계 문서 파일명. */
  source: string;
}

export interface NodeDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 작은 번호·역할 글. */
  overline?: string;
  label: string;
  variant: 'app' | 'flow' | 'hub' | 'sync' | 'db';
  doc: Doc;
}

export interface GateDef {
  id: string;
  /** 차단봉 가운데. 흐름 선 위에 놓인다. */
  x: number;
  y: number;
  label: string;
  /** 라벨 위치. */
  labelSide: 'above' | 'below';
  doc: Doc;
}

export interface ToolDef {
  name: string;
  kind: ToolKind;
  label: string;
  x: number;
  y: number;
  doc: Doc;
}

export interface EdgeDef {
  id: string;
  /** SVG path. */
  d: string;
  /** 요청→응답 주 경로는 굵게. */
  main?: boolean;
  dashed?: boolean;
  arrow?: boolean;
}

// ── 배치 ───────────────────────────────────────────────────────────────

export const ROW_TOP = 220;
export const ROW_BOTTOM = 680;
export const ROW_SYNC = 870;
const NODE_W = 200;
const NODE_H = 88;
const APP = { x: 80, y: 160, w: 220, h: 580 };
const HUB = { x: 1240, y: 160, w: 260, h: 400 };
export const SHELF = { x: 1720, y: 120, w: 600, h: 610 };
const DB = { x: 1870, y: 820, w: 300, h: 100 };

export const SERVER_REGION = { x: 400, y: 100, w: 1960, h: 860 };
export const SYNC_DIVIDER_Y = 780;

const flow = (id: string, cx: number, cy: number, overline: string, label: string, doc: Doc): NodeDef => ({
  id,
  x: cx - NODE_W / 2,
  y: cy - NODE_H / 2,
  w: NODE_W,
  h: NODE_H,
  overline,
  label,
  variant: 'flow',
  doc,
});

export const NODES: NodeDef[] = [
  {
    id: 'app',
    ...APP,
    label: '앱',
    variant: 'app',
    doc: {
      overline: '앱 · 원본 저장소',
      title: '앱',
      summary: '할 일·계획의 원본은 앱에 있다. 탱글은 사본을 읽고 변경안을 제안할 뿐, 원본은 사용자가 카드를 수락해야 바뀐다.',
      points: [
        { head: '요청', body: 'session_id와 현재 입력만 보낸다. 이전 대화(history)는 보내지 않는다.' },
        { head: '카드 수락', body: '수락하면 앱이 대상 존재와 지원 연산을 확인한 뒤 원본에 적용한다. 자연어 동의는 수락이 아니다.' },
        { head: '동기화', body: '원본 변경과 카드 수락·거절 결과는 채팅이 아니라 동기화로만 서버에 보낸다.' },
      ],
      side: [
        { label: '입력 한도', value: '본문 4,000자 · 답변 500자' },
        { label: '선택 항목', value: '최대 20개' },
      ],
      source: 'request-response.md · synchronization.md',
    },
  },
  flow('receive', 660, ROW_TOP, '01', '요청 수신', {
    overline: '탱글 서버 · 01',
    title: '요청 수신',
    summary: '앱의 입력과 맥락을 받아 턴을 만든다. 입력 가드레일을 통과한 요청만 여기까지 온다.',
    points: [
      { head: '입력 두 가지', body: '자유 입력(text)과 질문 답변 묶음(answers). 답변 본문은 저장하지 않고 개수만 남긴다.' },
      { head: '맥락', body: '요청 시각·시간대·선택 항목(selected_targets)을 함께 받는다. 본문의 {{task:ID}}는 선택 항목에 있어야 한다.' },
      { head: '중복 접수', body: '같은 turn_id가 다시 오면 기존 처리에 연결하고, 다른 세션에 쓰인 ID는 거절한다.' },
    ],
    side: [
      { label: '식별자', value: 'session_id · turn_id' },
      { label: '저장', value: 'turns 테이블' },
    ],
    source: 'request-response.md',
  }),
  flow('conversation', 960, ROW_TOP, '02', '대화 연결', {
    overline: '탱글 서버 · 02',
    title: '대화 연결',
    summary: '세션에 묶인 OpenAI Conversation을 찾아 이어 붙인다. 대화 원문은 서버 DB가 아니라 Conversation에만 있다.',
    points: [
      { head: '처음 대화', body: 'Conversation을 새로 만들고 세션에 연결한다.' },
      { head: '이어지는 대화', body: '같은 Conversation으로 이전 문맥을 그대로 쓴다. 앱은 history를 보내지 않는다.' },
      { head: '서버 저장', body: '사용자·세션·Conversation 연결 정보와 식별자만 남긴다.' },
    ],
    side: [
      { label: '외부', value: 'Conversations API' },
      { label: '저장', value: 'sessions 테이블' },
    ],
    source: 'conversation-history.md',
  }),
  {
    id: 'model',
    ...HUB,
    overline: '03 · 모델 호출',
    label: 'AI 모델',
    variant: 'hub',
    doc: {
      overline: '탱글 서버 · 03',
      title: 'AI 모델',
      summary: 'Responses API를 스트리밍으로 부른다. 지침·사용자 데이터·도구 결과가 들어가고, 도구 호출 또는 최종 출력이 나온다.',
      points: [
        { head: '들어가는 것', body: 'developer 지침, 사용자 입력·항목·과거 대화는 user/tool 데이터로만. 데이터 속 지시는 권한으로 받지 않는다.' },
        { head: '나오는 것', body: 'strict 스키마의 도구 호출, 또는 답변·질문·제안 참조로 이루어진 최종 출력.' },
        { head: '한도', body: '전체 90초, 모델 왕복 12회, 호출당 출력 8,192토큰. 넘으면 카드 없이 고정 안내로 끝낸다.' },
        { head: '보정 1회', body: '형식·업무 오류는 뜻을 바꾸지 않는 범위에서 한 번만 다시 시킨다.' },
      ],
      side: [
        { label: '외부', value: 'Responses API' },
        { label: '식별', value: 'safety_identifier' },
      ],
      source: 'guardrails.md §5 · conversation-history.md',
    },
  },
  flow('assemble', 960, ROW_BOTTOM, '04', '완성 단위 묶기', {
    overline: '탱글 서버 · 04',
    title: '완성 단위 묶기',
    summary: '모델의 참조를 실제 카드로 조립한다. 같은 항목의 변경은 한 카드로 합치고 공개 ID를 붙인다.',
    points: [
      { head: '카드 조립', body: 'proposal_refs·information_card_refs를 이번 턴의 임시 공간에서 찾아 D11 제안 카드·D12 브리핑으로 만든다.' },
      { head: '합치기', body: '같은 상위 항목의 변경안은 최초 상태 → 최종 상태를 비교하는 한 카드가 된다.' },
      { head: '질문', body: '질문 1~3개, 선택지 2~4개. 선택지 값은 서명 토큰이라 앱이 위조할 수 없다.' },
    ],
    side: [
      { label: '카드 수', value: '응답당 1~4개' },
      { label: '저장', value: 'responses · proposals · questions' },
    ],
    source: 'response-proposal-contract.md',
  }),
  flow('deliver', 560, ROW_BOTTOM, '05', '앱에 전달', {
    overline: '탱글 서버 · 05',
    title: '앱에 전달',
    summary: '검증과 저장을 끝낸 응답만 보낸다. 일부만 성공한 결과를 정상처럼 보내지 않는다.',
    points: [
      { head: '응답 구성', body: '답변 말풍선, 질문 묶음 또는 제안 카드, 정보 카드 순서. response_id가 붙는다.' },
      { head: '전부 아니면 없음', body: '목록 전체를 검증하고 저장에 성공한 뒤 보낸다. 마지막 카드 실패를 숨기지 않는다.' },
      { head: '실패', body: '오류 응답은 code·message·retryable로 간다. 한도 초과는 고정 안내 문장이다.' },
    ],
    side: [{ label: '전송', value: 'SSE 스트리밍' }],
    source: 'request-response.md · streaming-and-questions.md',
  }),
  {
    id: 'sync',
    x: 700,
    y: ROW_SYNC - NODE_H / 2,
    w: NODE_W,
    h: NODE_H,
    overline: 'S',
    label: '동기화 처리',
    variant: 'sync',
    doc: {
      overline: '탱글 서버 · 동기화',
      title: '동기화 처리',
      summary: '앱 원본의 최신 상태를 사본으로 받는다. 모델을 거치지 않고 검증과 저장을 한 번에 처리한다.',
      points: [
        { head: '보내는 것', body: '항목의 최신 상태(메모·순서 포함)와 제안 수락·거절·적용 결과. 새 대화 턴을 만들지 않는다.' },
        { head: '원자적 처리', body: '소유권 검증과 사본·제안 상태 갱신을 하나로 묶고, 저장이 끝난 뒤에 응답한다.' },
        { head: '앱의 기록', body: '앱은 ID별 미동기화 기록을 두고 서버 완료 응답을 받으면 지운다. 전송 중 바뀌면 유지한다.' },
      ],
      side: [
        { label: '버전', value: '저장하지 않음' },
        { label: '충돌 대책', value: '범위 밖' },
      ],
      source: 'synchronization.md',
    },
  },
  {
    id: 'db',
    ...DB,
    label: '탱글 DB',
    variant: 'db',
    doc: {
      overline: '탱글 서버 · 저장소',
      title: '탱글 DB',
      summary: '앱에서 동기화한 사본과 턴·응답·카드를 둔다. 대화 원문과 답변 본문은 두지 않는다.',
      points: [
        { head: '사본', body: 'users · items · subtasks. 모바일이 원본이고 버전·last_synced_at은 없다.' },
        { head: '대화', body: 'sessions · turns · responses. 원문은 OpenAI Conversation에만 있다.' },
        { head: '카드', body: 'questions · proposals. 제안 내용과 수락·거절·적용 결과를 둔다.' },
      ],
      side: [{ label: '테이블', value: '8개' }],
      source: 'database-schema.md',
    },
  },
];

// ── 가드레일 ───────────────────────────────────────────────────────────

export const GATES: GateDef[] = [
  {
    id: 'input',
    x: 440,
    y: ROW_TOP,
    label: '입력 검증',
    labelSide: 'below',
    doc: {
      overline: '가드레일 · 1층 입력',
      title: '입력 검증',
      summary: '모델을 부르기 전에 코드로 끝내는 규칙 검사. 막히면 토큰을 쓰지 않고 도구도 돌지 않는다.',
      points: [
        { head: '신원', body: '프록시 인증을 검증하고 사용자·세션·턴을 서버 맥락에 연결한다.' },
        { head: '길이', body: '본문 4,000자, 질문 직접 입력 답변 500자.' },
        { head: '참조 소유권', body: 'session_id·선택 항목(최대 20개)·본문 멘션·option_id가 현재 사용자 것인지 확인한다.' },
        { head: '질문 답변', body: '누락·중복·위조·만료, option_id와 text 동시 입력, 빈 답변을 거절한다.' },
        { head: '중복 접수', body: '같은 turn_id는 기존 처리에 연결하고 다른 사용자·세션의 ID는 거절한다.' },
      ],
      side: [
        { label: '막히면', value: '입력 차단(blocked_input)' },
        { label: '방식', value: '규칙 검사(blocking)' },
      ],
      source: 'guardrails.md §1',
    },
  },
  {
    id: 'prompt',
    x: 1130,
    y: ROW_TOP,
    label: '프롬프트 규칙',
    labelSide: 'below',
    doc: {
      overline: '가드레일 · 1층 입력',
      title: '프롬프트 규칙',
      summary: '위기 신호·주제 밖 요청·탈옥은 별도 분류 모델 없이 프롬프트와 구조로 다룬다.',
      points: [
        { head: '위기 신호', body: '위험한 말이 보이면 정리를 멈추고 카드를 만들지 않으며, 걱정을 전하고 도움받을 곳(109)을 안내한다.' },
        { head: '주제 밖', body: '코드·숙제·일반 지식은 직접 답하지 않고 할 일로 적어둘지 묻는다. 인사는 짧게 받아준다.' },
        { head: '데이터 분리', body: '입력·항목 제목·과거 대화·도구 결과는 user/tool 데이터로만 들어가고, 그 안의 지시는 권한이 아니다.' },
        { head: '좁은 통로', body: '도구 인자와 최종 출력은 strict 스키마. 임의 SQL·경로·URL을 실행하는 인자가 없다.' },
      ],
      side: [
        { label: '분류기', value: '두지 않음' },
        { label: '최종 결정권', value: '서버 소유권 검사 · 카드 수락' },
      ],
      source: 'guardrails.md §1',
    },
  },
  {
    id: 'tool-call',
    x: 1610,
    y: 380,
    label: '도구 호출 검증',
    labelSide: 'above',
    doc: {
      overline: '가드레일 · 2층 도구',
      title: '도구 호출 검증',
      summary: '12개 도구 각각의 실행 직전에 인자를 코드로 검사한다. 하나라도 어기면 실행하지 않는다.',
      points: [
        { head: '허용 목록', body: '정해진 12개 도구만 실행한다.' },
        { head: '스키마', body: 'strict · additionalProperties false · 필드별 타입·enum·배열 범위.' },
        { head: '소유권', body: '상위 항목의 사용자와 하위 작업의 부모를 확인하고 날짜·종류 필터를 조회마다 적용한다.' },
        { head: '계획 규칙', body: '계획은 날짜 필수. 시각 없는 알림, 할 일의 날짜·시각·알림, 하위 작업의 예상 시간을 거절한다.' },
        { head: '실패 반환', body: 'field_errors를 담은 오류를 돌려주고 일부만 반영하지 않는다.' },
      ],
      side: [
        { label: '위험도', value: '조회·브리핑 낮음 · 제안 중간 · 고위험 없음' },
        { label: '막히면', value: '보정 1회 → 도구 실패(tool_failed)' },
      ],
      source: 'guardrails.md §2',
    },
  },
  {
    id: 'tool-result',
    x: 1610,
    y: 520,
    label: '도구 결과 검증',
    labelSide: 'below',
    doc: {
      overline: '가드레일 · 2층 도구',
      title: '도구 결과 검증',
      summary: '도구가 돌려준 결과를 모델에 넘기기 전에 정리한다. 실패를 빈 결과로 바꾸지 않는다.',
      points: [
        { head: '노출 차단', body: '인증 토큰·SQL 오류·다른 사용자 정보를 결과에 넣지 않는다.' },
        { head: '실패 구분', body: '개별 대상 부재(unavailable_ids)와 DB 장애(SOURCE_UNAVAILABLE)를 구분한다.' },
        { head: '크기', body: '한도를 넘으면 LIMIT_EXCEEDED로 알리고 일부 목록을 전체처럼 돌려주지 않는다.' },
      ],
      side: [{ label: '막히면', value: '도구 실패(tool_failed)' }],
      source: 'guardrails.md §2',
    },
  },
  {
    id: 'output',
    x: 760,
    y: ROW_BOTTOM,
    label: '완성 검증',
    labelSide: 'below',
    doc: {
      overline: '가드레일 · 4층 출력',
      title: '완성 검증',
      summary: '응답을 저장하고 보내기 전에 구조와 참조만 검사한다. 문장 내용 검사는 두지 않는다.',
      points: [
        { head: '구조', body: '답변·질문·정보 카드 중 하나는 있어야 한다. 질문 1~3개, 선택지 2~4개, 질문과 제안을 한 ask에 섞지 않는다.' },
        { head: '참조', body: '카드·선택지의 참조는 이번 턴의 유효한 것이거나 사용자 소유 항목만. 가짜·다른 턴·실패한 참조는 거절.' },
        { head: '카드 수', body: '같은 항목끼리 합친 뒤 제안 카드 1~4개.' },
        { head: '전부 아니면 없음', body: '목록 전체를 검증·저장한 뒤 보낸다.' },
      ],
      side: [
        { label: '막히면', value: '보정 1회 → 출력 거부(output_rejected)' },
        { label: '내용 검사', value: '두지 않음' },
      ],
      source: 'guardrails.md §4',
    },
  },
  {
    id: 'sync-check',
    x: 540,
    y: ROW_SYNC,
    label: '소유권·중복 검증',
    labelSide: 'below',
    doc: {
      overline: '가드레일 · 동기화',
      title: '소유권·중복 검증',
      summary: '동기화 요청의 입력과 데이터 소유권을 확인하고, 같은 제안의 중복 전달이 중복 적용으로 이어지지 않게 한다.',
      points: [
        { head: '소유권', body: '항목·하위 작업·제안이 현재 사용자 것인지 확인한다.' },
        { head: '중복', body: '같은 proposal_id가 다시 와도 중복 생성·적용으로 이어지지 않는다.' },
        { head: '원자성', body: '검증과 저장을 하나로 묶어 함께 성공하거나 함께 실패한다.' },
      ],
      side: [{ label: '버전 비교', value: '하지 않음' }],
      source: 'synchronization.md · guardrails.md §3',
    },
  },
];

// ── 도구 선반 ───────────────────────────────────────────────────────────

const TOOL_DOC: Record<string, { role: string; returns: string; args: string }> = {
  search_todos: { role: '제목·완료 여부로 쌓아 둔 할 일을 검색한다.', returns: '실제 하위 작업을 포함한 목록 · total_count · next_cursor', args: 'query · completion · limit(1~50) · cursor' },
  search_plans: { role: '제목·날짜 범위·완료 여부로 계획을 검색한다.', returns: '실제 하위 작업을 포함한 목록 · total_count · next_cursor', args: 'query · date_range · completion · limit · cursor' },
  get_items: { role: '이미 아는 ID의 현재 내용을 확인한다.', returns: '항목 목록 + 조회 불가 ID(unavailable_ids)', args: 'ids' },
  propose_create_todo: { role: '날짜 없는 새 할 일을 준비한다.', returns: 'D11 생성 카드', args: 'title · estimated_minutes · memo · subtasks' },
  propose_update_todo: { role: '제목·예상 시간·메모·하위 작업 변경을 준비한다.', returns: 'D11 변경 카드', args: 'target_item_id · changes · subtasks' },
  propose_delete_todo: { role: '할 일 삭제를 준비한다.', returns: 'D11 삭제 카드', args: 'target_item_id' },
  propose_move_todo_to_plan: { role: '날짜를 정해 기존 할 일을 계획으로 옮길 준비를 한다.', returns: 'D11 이동 카드', args: 'target_item_id · date · time · reminder_minutes_before' },
  propose_create_plan: { role: '날짜가 있는 새 계획을 준비한다.', returns: 'D11 생성 카드', args: 'title · date · time · reminder_minutes_before · estimated_minutes · memo · subtasks' },
  propose_update_plan: { role: '내용·날짜·시각·알림 변경을 준비한다.', returns: 'D11 변경 카드', args: 'target_item_id · changes · subtasks' },
  propose_delete_plan: { role: '계획 삭제를 준비한다.', returns: 'D11 삭제 카드', args: 'target_item_id' },
  propose_move_plan_to_todo: { role: '일정을 해제하고 할 일로 옮길 준비를 한다.', returns: 'D11 이동 카드', args: 'target_item_id' },
  get_today_briefing: { role: '오늘 계획과 미완료 할 일을 한 장으로 구성한다.', returns: 'D12 정보 카드(수락·거절 없음)', args: 'date' },
};

const KIND_TITLE: Record<ToolKind, string> = { query: '조회', proposal: '제안', briefing: '브리핑' };
const RISK: Record<ToolKind, string> = { query: '낮음 · 사본 읽기', proposal: '중간 · 임시 변경안만', briefing: '낮음 · 사본 읽기' };

const CHIP_W = 280;
const CHIP_H = 40;
const CHIP_GAP = 12;

function shelfLayout(): ToolDef[] {
  const out: ToolDef[] = [];
  let y = SHELF.y + 70;
  for (const kind of ['query', 'proposal', 'briefing'] as ToolKind[]) {
    const group = TOOLS.filter((t) => t.kind === kind);
    y += 30; // 묶음 제목 자리
    group.forEach((t, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const d = TOOL_DOC[t.name]!;
      out.push({
        name: t.name,
        kind,
        label: t.label,
        x: SHELF.x + 20 + col * (CHIP_W + CHIP_GAP),
        y: y + row * (CHIP_H + CHIP_GAP),
        doc: {
          overline: `도구 · ${KIND_TITLE[kind]}`,
          title: t.name,
          summary: d.role,
          points: [
            { head: '인자', body: d.args },
            { head: '반환', body: d.returns },
            { head: '검증', body: '호출 전 strict 스키마·소유권·계획 규칙 검사, 호출 뒤 노출 차단·실패 구분·크기 검사.' },
          ],
          side: [
            { label: '종류', value: KIND_TITLE[kind] },
            { label: '위험도', value: RISK[kind] },
            { label: '원본 변경', value: '없음' },
          ],
          source: 'agent-tools.md · agent-tool-contracts.md',
        },
      });
    });
    y += Math.ceil(group.length / 2) * (CHIP_H + CHIP_GAP) + 18;
  }
  return out;
}

export const TOOL_CHIPS = shelfLayout();
export const CHIP = { w: CHIP_W, h: CHIP_H };

/** 선반 안 묶음 제목 위치. 첫 칩 바로 위. */
export const SHELF_GROUPS = (['query', 'proposal', 'briefing'] as ToolKind[]).map((kind) => {
  const first = TOOL_CHIPS.find((t) => t.kind === kind)!;
  const count = TOOL_CHIPS.filter((t) => t.kind === kind).length;
  return { kind, title: `${KIND_TITLE[kind]} ${count}`, x: first.x, y: first.y - 12 };
});

// ── 선 ─────────────────────────────────────────────────────────────────

const node = (id: string) => NODES.find((n) => n.id === id)!;
const right = (n: NodeDef) => n.x + n.w;

export const EDGES: EdgeDef[] = [
  // 요청(위 줄): 앱 → 01 → 02 → AI 모델
  { id: 'app-receive', d: `M${right(node('app'))} ${ROW_TOP} H${node('receive').x}`, main: true, arrow: true },
  { id: 'receive-conv', d: `M${right(node('receive'))} ${ROW_TOP} H${node('conversation').x}`, main: true, arrow: true },
  { id: 'conv-model', d: `M${right(node('conversation'))} ${ROW_TOP} H${node('model').x}`, main: true, arrow: true },
  // 응답(아래 줄): AI 모델 → 04 → 05 → 앱
  { id: 'model-assemble', d: `M${node('model').x} ${ROW_BOTTOM - 40} H${right(node('assemble'))}`, main: true, arrow: true },
  { id: 'assemble-deliver', d: `M${node('assemble').x} ${ROW_BOTTOM} H${right(node('deliver'))}`, main: true, arrow: true },
  { id: 'deliver-app', d: `M${node('deliver').x} ${ROW_BOTTOM} H${right(node('app'))}`, main: true, arrow: true },
  // 도구: AI 모델 → 선반(호출), 선반 → AI 모델(결과)
  { id: 'model-shelf', d: `M${right(node('model'))} 380 H${SHELF.x}`, arrow: true },
  { id: 'shelf-model', d: `M${SHELF.x} 520 H${right(node('model'))}`, arrow: true },
  // 선반 → DB
  { id: 'shelf-db', d: `M${SHELF.x + SHELF.w / 2} ${SHELF.y + SHELF.h} V${node('db').y}`, arrow: true },
  // 동기화: 앱 → 검증 → S ⇢ DB
  { id: 'app-sync', d: `M${node('app').x + node('app').w / 2} ${node('app').y + node('app').h} V${ROW_SYNC} H${node('sync').x}`, arrow: true },
  { id: 'sync-db', d: `M${right(node('sync'))} ${ROW_SYNC} H${node('db').x}`, dashed: true, arrow: true },
];

// AI 모델 → 04 선은 모델 블록 아래쪽에서 나온다. 아래 줄(680)과 블록 바닥(560) 사이를 꺾어 잇는다.
EDGES[3] = {
  id: 'model-assemble',
  d: `M${node('model').x + 60} ${node('model').y + node('model').h} V${ROW_BOTTOM} H${right(node('assemble'))}`,
  main: true,
  arrow: true,
};

export type Selected = { kind: 'node'; id: string } | { kind: 'gate'; id: string } | { kind: 'tool'; id: string };

/** 설명 창의 이전·다음 순서: 요청 흐름 → 도구 → 응답 흐름 → 동기화 → 저장소. */
export const TOUR: Selected[] = [
  { kind: 'node', id: 'app' },
  { kind: 'gate', id: 'input' },
  { kind: 'node', id: 'receive' },
  { kind: 'node', id: 'conversation' },
  { kind: 'gate', id: 'prompt' },
  { kind: 'node', id: 'model' },
  { kind: 'gate', id: 'tool-call' },
  ...TOOL_CHIPS.map((t): Selected => ({ kind: 'tool', id: t.name })),
  { kind: 'gate', id: 'tool-result' },
  { kind: 'node', id: 'assemble' },
  { kind: 'gate', id: 'output' },
  { kind: 'node', id: 'deliver' },
  { kind: 'gate', id: 'sync-check' },
  { kind: 'node', id: 'sync' },
  { kind: 'node', id: 'db' },
];

export function docOf(sel: Selected): Doc {
  if (sel.kind === 'node') return node(sel.id).doc;
  if (sel.kind === 'gate') return GATES.find((g) => g.id === sel.id)!.doc;
  return TOOL_CHIPS.find((t) => t.name === sel.id)!.doc;
}

export function tourIndex(sel: Selected): number {
  return TOUR.findIndex((t) => t.kind === sel.kind && t.id === sel.id);
}
