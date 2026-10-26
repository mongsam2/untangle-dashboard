import type { ChatResponse } from '../api/types';

// 탱글 서버가 answer와 ask.text가 모두 빈 응답에 채우는 안내 문장. 백엔드가 두 말풍선을 하나로 잇기 때문에
// 둘 다 비면 앱에 빈 말풍선이 가므로 서버가 대신 채운다(untangle-ai-v2 `agent/output.py`의 `fallback_bubble`).
// 기록의 answer가 이 문장이면 모델이 말풍선을 비운 것이지 모델이 쓴 문장이 아니다.
export const FALLBACK_BUBBLES: readonly string[] = ['하나만 물어볼게.', '몇 가지만 물어볼게.', '이렇게 바꿔보는 건 어때?', '오늘 할 일을 정리해봤어.'];

/** 서버가 채운 기본 문구인지. 모델이 같은 문장을 직접 쓴 경우는 구분할 수 없어 기본 문구로 본다. */
export function isFallbackBubble(text: string): boolean {
  return FALLBACK_BUBBLES.includes(text.trim());
}

/** 응답의 answer가 서버 기본 문구인지. 질문·브리핑만 있거나 안내 문장 없는 제안에서만 나온다. */
export function hasFallbackAnswer(response: Pick<ChatResponse, 'answer' | 'ask'>): boolean {
  return response.answer !== null && isFallbackBubble(response.answer.text) && !(response.ask?.text ?? '').trim();
}
