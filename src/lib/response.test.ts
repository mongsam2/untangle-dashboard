import { describe, expect, it } from 'vitest';
import { FALLBACK_BUBBLES, hasFallbackAnswer, isFallbackBubble } from './response';

describe('서버 기본 말풍선', () => {
  it('다섯 문장을 기본 문구로 본다', () => {
    expect(FALLBACK_BUBBLES).toHaveLength(5);
    expect(isFallbackBubble('추가해뒀어. 필요 없으면 되돌려도 돼.')).toBe(true);
    for (const text of FALLBACK_BUBBLES) expect(isFallbackBubble(text)).toBe(true);
    expect(isFallbackBubble('운동은 몇 시에 할 거야?')).toBe(false);
  });

  it('answer만 보고 기본 문구인지 정한다', () => {
    expect(hasFallbackAnswer({ answer: { text: '하나만 물어볼게.' } })).toBe(true);
    expect(hasFallbackAnswer({ answer: { text: '보고서 초안을 내일로 옮겨볼까?' } })).toBe(false);
    expect(hasFallbackAnswer({ answer: null })).toBe(false);
  });
});
