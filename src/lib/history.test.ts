import { describe, expect, it } from 'vitest';
import { buttonLabelOf, parseHistoryLine, unansweredIndexes } from './history';

const user = (text: string) => ({ role: 'user' as const, text });
const agent = (text: string) => ({ role: 'assistant' as const, text });

describe('서버가 만든 이전 대화', () => {
  it('사용자 발화의 날짜 접두사를 떼어 낸다', () => {
    expect(parseHistoryLine(user('[2026-10-18] 로드맵을 제안해줘.'))).toEqual({
      role: 'user',
      day: '2026-10-18',
      text: '로드맵을 제안해줘.',
      kind: 'message',
      proposalTitle: null,
    });
  });

  it('날짜가 없는 예전 형식과 탱글 발화는 그대로 둔다', () => {
    expect(parseHistoryLine(user('날짜 없이 저장된 말'))).toMatchObject({ day: null, text: '날짜 없이 저장된 말' });
    // 탱글 발화는 접두사를 붙이지 않으므로 대괄호로 시작해도 건드리지 않는다.
    expect(parseHistoryLine(agent('[2026-10-18] 이건 답변 문구'))).toMatchObject({ day: null, text: '[2026-10-18] 이건 답변 문구' });
  });

  it('제안 버튼 턴: 수락·거절과 제목', () => {
    const accept = parseHistoryLine(user('[2026-10-18] [제안 수락: 포트폴리오 공개]'));
    expect(accept).toMatchObject({ day: '2026-10-18', kind: 'proposal_accept', proposalTitle: '포트폴리오 공개', text: '[제안 수락: 포트폴리오 공개]' });
    expect(buttonLabelOf(accept)).toBe('제안 수락 · 포트폴리오 공개');
    const reject = parseHistoryLine(user('[2026-10-19] [제안 거절]'));
    expect(reject).toMatchObject({ kind: 'proposal_reject', proposalTitle: null });
    expect(buttonLabelOf(reject)).toBe('제안 거절');
  });

  it('제안 버튼처럼 보이지 않는 대괄호 문장은 일반 메시지다', () => {
    expect(parseHistoryLine(user('[2026-10-18] [메모] 제안 수락'))).toMatchObject({ kind: 'message' });
  });

  it('끝나지 않은 턴: 사용자 발화 뒤에 탱글 발화가 없다', () => {
    const history = [user('[d] a'), agent('답'), user('[d] b'), user('[d] c'), agent('답2'), user('[d] d')];
    expect([...unansweredIndexes(history)]).toEqual([2, 5]);
    expect(unansweredIndexes([]).size).toBe(0);
  });
});
