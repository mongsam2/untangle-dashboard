import { useEffect, useState } from 'react';
import { lastIndex, nextTick, seek, START, toggle, type ReplayScript, type ReplayState } from './replayModel';

// 재생 상태와 타이머. 상태가 바뀔 때마다 다음 박자 하나만 예약한다.
export function useReplay(script: ReplayScript | null) {
  const [state, setState] = useState<ReplayState>(START);

  useEffect(() => {
    if (!script) return;
    const tick = nextTick(state, script);
    if (!tick) return;
    const timer = setTimeout(() => setState(tick.next), tick.delay);
    return () => clearTimeout(timer);
  }, [state, script]);

  return {
    state,
    toggle: () => script && setState((s) => toggle(s, script)),
    prev: () => script && setState((s) => seek(s.idx - 1, script)),
    next: () => script && setState((s) => seek(Math.min(lastIndex(script), s.idx + 1), script)),
    seek: (i: number) => script && setState(seek(i, script)),
  };
}
