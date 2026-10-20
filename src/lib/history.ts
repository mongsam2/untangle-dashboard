import type { HistoryMessage } from '../api/types';

/*
 * 이전 대화(`RunDetailResponse.history`)는 요청이 실어 보낸 값이 아니라 서버가 같은 대화의 앞선 턴으로 다시 만든 값이다.
 *  - 사용자 발화 앞에는 그 턴을 보낸 날짜가 `[YYYY-MM-DD] `로 붙는다.
 *  - 제안 카드 버튼 턴은 `[제안 수락: 제목]`·`[제안 거절: 제목]`(제목을 못 찾으면 `[제안 수락]`)으로 적힌다.
 *  - 끝나지 않은 턴(응답이 없거나 오류로 끝남)은 사용자 발화만 남고 탱글 발화가 없다.
 * 모델이 본 문자열을 그대로 보여주되, 화면에서 날짜와 버튼 턴을 따로 꾸밀 수 있게 나눈다.
 */

export type HistoryKind = 'message' | 'proposal_accept' | 'proposal_reject';

export interface HistoryLine {
  role: HistoryMessage['role'];
  /** 사용자 발화 앞의 날짜(YYYY-MM-DD). 없으면 null. */
  day: string | null;
  /** 날짜 접두사를 뺀 발화. 버튼 턴은 `[제안 수락: 제목]` 모양 그대로다. */
  text: string;
  kind: HistoryKind;
  /** 버튼 턴이 가리킨 제안 제목. 제목이 없으면 null. */
  proposalTitle: string | null;
}

const DAY_RE = /^\[(\d{4}-\d{2}-\d{2})\] /;
const BUTTON_RE = /^\[(제안 수락|제안 거절)(?:: (.+))?\]$/;

export function parseHistoryLine(h: HistoryMessage): HistoryLine {
  if (h.role !== 'user') return { role: h.role, day: null, text: h.text, kind: 'message', proposalTitle: null };
  const dayMatch = DAY_RE.exec(h.text);
  const text = dayMatch ? h.text.slice(dayMatch[0].length) : h.text;
  const button = BUTTON_RE.exec(text);
  return {
    role: 'user',
    day: dayMatch?.[1] ?? null,
    text,
    kind: button ? (button[1] === '제안 수락' ? 'proposal_accept' : 'proposal_reject') : 'message',
    proposalTitle: button?.[2] ?? null,
  };
}

/** 사용자 발화 바로 뒤에 탱글 발화가 없는 위치. 마지막 발화가 사용자라면 그 턴도 끝나지 않은 것이다. */
export function unansweredIndexes(history: HistoryMessage[]): Set<number> {
  const out = new Set<number>();
  history.forEach((h, i) => {
    if (h.role === 'user' && history[i + 1]?.role !== 'assistant') out.add(i);
  });
  return out;
}

/** 앱 대화창에서 버튼 턴을 누른 말풍선으로 보여줄 문구. */
export function buttonLabelOf(line: HistoryLine): string {
  const label = line.kind === 'proposal_accept' ? '제안 수락' : '제안 거절';
  return line.proposalTitle ? label + ' · ' + line.proposalTitle : label;
}
