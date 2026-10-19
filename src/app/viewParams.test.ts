import { describe, expect, it } from 'vitest';
import { backToCaseParams, closeParams, filtersOnly, openCaseParams, openRunParams, readView, replayParams } from './viewParams';

const p = (s: string) => new URLSearchParams(s);

describe('viewParams', () => {
  it('요청 인스펙터를 열면 케이스는 닫히고 필터는 남는다', () => {
    const next = openRunParams(p('status=tool_failed&case=T21'), 'r1');
    expect(next.toString()).toBe('status=tool_failed&run=r1');
    expect(readView(next)).toEqual({ run: 'r1', from: null, case: null, replay: false });
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
    expect(readView(on)).toEqual({ run: 'r1', from: 'T10', case: null, replay: true });
    expect(replayParams(on, false).get('replay')).toBeNull();
    expect(replayParams(p('case=T10'), true).toString()).toBe('case=T10');
  });

  it('닫기와 화면 이동은 필터만 남긴다', () => {
    const q = p('source=real&run=r1&from=T1&replay=1');
    expect(closeParams(q).toString()).toBe('source=real');
    expect(filtersOnly(openCaseParams(q, 'T5')).toString()).toBe('source=real');
  });
});
