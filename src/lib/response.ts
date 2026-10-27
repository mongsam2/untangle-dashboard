import type { ChatResponse } from '../api/types';

// 탱글 서버가 answer가 빈 응답에 채우는 안내 문장(untangle-ai-v2 `agent/output.py`의 `fallback_bubble`).
// 말풍선은 answer 하나뿐이라 비워 두면 앱에 빈 말풍선이 가므로 서버가 대신 채운다. 질문은 개수에 맞추고,
// 추가 카드만 있는 응답은 앱이 수락 없이 바로 저장하므로 해둔 말로 채운다.
// 기록의 answer가 이 문장이면 모델이 말풍선을 비운 것이지 모델이 쓴 문장이 아니다.
export const FALLBACK_BUBBLES: readonly string[] = [
  '하나만 물어볼게.',
  '몇 가지만 물어볼게.',
  '이렇게 바꿔보는 건 어때?',
  '추가해뒀어. 필요 없으면 되돌려도 돼.',
  '오늘 할 일을 정리해봤어.',
];

/** 서버가 채운 기본 문구인지. 모델이 같은 문장을 직접 쓴 경우는 구분할 수 없어 기본 문구로 본다. */
export function isFallbackBubble(text: string): boolean {
  return FALLBACK_BUBBLES.includes(text.trim());
}

/** 응답의 answer가 서버 기본 문구인지. */
export function hasFallbackAnswer(response: Pick<ChatResponse, 'answer'>): boolean {
  return response.answer !== null && isFallbackBubble(response.answer.text);
}
