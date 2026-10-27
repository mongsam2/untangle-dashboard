import { describe, expect, it } from 'vitest';
import { backToCaseParams, backToSessionParams, closeParams, filtersOnly, openCaseParams, openRunParams, openSessionParams, openTurnParams, readTestView, readView, replayParams, writeTestView } from './viewParams';

const p = (s: string) => new URLSearchParams(s);

describe('viewParams', () => {
  it('실행을 열면 필터는 남고 다른 패널은 닫힌다', () => {
    const next = openRunParams(p('status=error&case=C01'), 'r1');
    expect(next.toString()).toBe('status=error&run=r1');
    expect(readView(next)).toEqual({ run: 'r1', from: null, case: null, session: null, replay: false });
  });

  it('케이스에서 연 실행은 from을 가지고 돌아갈 수 있다', () => {
    const opened = openRunParams(p(''), 'r1', 'C03');
    expect(readView(opened).from).toBe('C03');
    expect(readView(backToCaseParams(opened)).case).toBe('C03');
  });

  it('세션의 턴을 열면 세션으로 돌아가는 링크가 남는다', () => {
    const opened = openTurnParams(p('source=test'), 's1', 'r1');
    expect(readView(opened)).toMatchObject({ run: 'r1', session: 's1' });
    expect(readView(backToSessionParams(opened))).toMatchObject({ run: null, session: 's1' });
  });

  it('실행·세션이 열려 있으면 케이스는 가린다', () => {
    expect(readView(p('run=r1&case=C01')).case).toBeNull();
    expect(readView(p('session=s1&case=C01')).case).toBeNull();
    expect(readView(openCaseParams(p('run=r1'), 'C01'))).toMatchObject({ run: null, case: 'C01' });
  });

  it('재생은 실행이나 세션이 열려 있을 때만 켜진다', () => {
    expect(readView(p('replay=1')).replay).toBe(false);
    expect(readView(replayParams(openSessionParams(p(''), 's1'), true))).toMatchObject({ session: 's1', replay: true });
    expect(replayParams(p('status=error'), true).toString()).toBe('status=error');
  });

  it('닫으면 필터만 남는다', () => {
    expect(closeParams(p('source=real&run=r1&from=C01&replay=1')).toString()).toBe('source=real');
  });

  it('테스트 탭 상태는 요청 상세를 열고 닫아도 남는다', () => {
    const tests = writeTestView(p('server=dev'), { tab: 'results', run: 'run-2', case: 'C031', filter: { key: 'info', value: 'ask' } });
    expect(tests.toString()).toBe('server=dev&tab=results&test_run=run-2&test_case=C031&test_filter=info%3Aask');
    expect(readTestView(closeParams(openRunParams(tests, 'r1')))).toEqual({ tab: 'results', run: 'run-2', case: 'C031', filter: { key: 'info', value: 'ask' } });
  });

  it('다른 화면으로 옮기면 테스트 탭 상태는 지운다', () => {
    expect(filtersOnly(p('status=error&tab=results&test_run=run-2&test_case=C031&run=r1')).toString()).toBe('status=error');
    expect(readTestView(p('tab=other&test_filter=info'))).toEqual({ tab: 'set', run: null, case: null, filter: null });
  });
});
