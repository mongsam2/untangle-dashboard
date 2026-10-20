import { describe, expect, it } from 'vitest';
import {
  backToCaseParams,
  backToConversationParams,
  closeParams,
  filtersOnly,
  openCaseParams,
  openConversationParams,
  openRunParams,
  openTurnParams,
  readView,
  replayParams,
} from './viewParams';

const p = (s: string) => new URLSearchParams(s);

describe('viewParams', () => {
  it('요청 인스펙터를 열면 케이스는 닫히고 필터는 남는다', () => {
    const next = openRunParams(p('status=tool_failed&case=T21'), 'r1');
    expect(next.toString()).toBe('status=tool_failed&run=r1');
    expect(readView(next)).toEqual({ run: 'r1', from: null, case: null, conversation: null, replay: false });
  });

  it('케이스 실행 목록에서 열면 돌아갈 케이스를 기억한다', () => {
    const next = openRunParams(p('case=T21'), 'r1', 'T21');
    expect(readView(next)).toMatchObject({ run: 'r1', from: 'T21' });
    expect(backToCaseParams(next).toString()).toBe('case=T21');
  });

  it('from이 없으면 돌아가기는 닫기와 같다', () => {
    expect(backToCaseParams(p('run=r1')).toString()).toBe('');
  });

  it('재생은 요청 인스펙터가 열려 있을 때만 켜진다', () => {
    expect(readView(p('replay=1')).replay).toBe(false);
    const on = replayParams(p('run=r1&from=T10&source=test'), true);
    expect(readView(on)).toEqual({ run: 'r1', from: 'T10', case: null, conversation: null, replay: true });
    expect(replayParams(on, false).get('replay')).toBeNull();
    expect(replayParams(p('case=T10'), true).toString()).toBe('case=T10');
  });

  it('대화 인스펙터는 케이스를 가리고, 대화의 요청을 열면 대화로 돌아갈 수 있다', () => {
    const conv = openConversationParams(p('source=real&case=T10'), 'c1');
    expect(conv.toString()).toBe('source=real&conversation=c1');
    expect(readView(p('case=T10&conversation=c1'))).toMatchObject({ case: null, conversation: 'c1' });
    const turn = openTurnParams(conv, 'c1', 'r1');
    expect(readView(turn)).toMatchObject({ run: 'r1', conversation: 'c1', from: null });
    expect(backToConversationParams(turn).toString()).toBe('source=real&conversation=c1');
    expect(backToConversationParams(p('run=r1')).toString()).toBe('');
    expect(openRunParams(turn, 'r2').get('conversation')).toBeNull();
  });

  it('대화만 열려 있으면 대화 재생이고, 요청과 함께면 요청 재생이다', () => {
    const on = replayParams(p('conversation=c1'), true);
    expect(readView(on)).toEqual({ run: null, from: null, case: null, conversation: 'c1', replay: true });
    const both = replayParams(p('conversation=c1&run=r1'), true);
    expect(readView(both)).toMatchObject({ run: 'r1', conversation: 'c1', replay: true });
    expect(replayParams(on, false).get('replay')).toBeNull();
  });

  it('닫기와 화면 이동은 필터만 남긴다', () => {
    const q = p('source=real&run=r1&from=T1&replay=1');
    expect(closeParams(q).toString()).toBe('source=real');
    expect(filtersOnly(openCaseParams(q, 'T5')).toString()).toBe('source=real');
  });
});
