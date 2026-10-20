import { useEffect, useState } from 'react';
import { advance, seekIn, START, toggleIn, type ReplayState, type Timeline } from './replayModel';

// 재생 상태와 타이머. 상태가 바뀔 때마다 다음 박자 하나만 예약한다. 요청·대화 재생이 같이 쓴다.
export function useReplay(timeline: Timeline | null) {
  const [state, setState] = useState<ReplayState>(START);

  useEffect(() => {
    if (!timeline) return;
    const tick = advance(state, timeline);
    if (!tick) return;
    const timer = setTimeout(() => setState(tick.next), tick.delay);
    return () => clearTimeout(timer);
  }, [state, timeline]);

  return {
    state,
    toggle: () => timeline && setState((s) => toggleIn(s, timeline)),
    prev: () => timeline && setState((s) => seekIn(s.idx - 1, timeline)),
    next: () => timeline && setState((s) => seekIn(Math.min(timeline.last, s.idx + 1), timeline)),
    seek: (i: number) => timeline && setState(seekIn(i, timeline)),
  };
}
