import { describe, expect, it } from 'vitest';
import { FALLBACK_BUBBLES, hasFallbackAnswer, isFallbackBubble } from './response';

describe('서버 기본 말풍선', () => {
  it('네 문장을 기본 문구로 본다', () => {
    expect(FALLBACK_BUBBLES).toHaveLength(4);
    for (const text of FALLBACK_BUBBLES) expect(isFallbackBubble(text)).toBe(true);
    expect(isFallbackBubble('운동은 몇 시에 할 거야?')).toBe(false);
  });

  it('ask.text가 있으면 같은 문장이라도 기본 문구로 보지 않는다', () => {
    expect(hasFallbackAnswer({ answer: { text: '하나만 물어볼게.' }, ask: null })).toBe(true);
    expect(hasFallbackAnswer({ answer: { text: '하나만 물어볼게.' }, ask: { type: 'proposal', text: '이렇게 바꿔볼까?', questions: null, proposals: [] } })).toBe(false);
    expect(hasFallbackAnswer({ answer: null, ask: null })).toBe(false);
  });
});
