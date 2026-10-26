import { useCallback, useEffect, useRef, useState } from 'react';
import type { Speed } from './replayModel';

/** 재생 위치를 requestAnimationFrame으로 올린다. 끝에 닿으면 멈추고, 끝에서 다시 누르면 처음부터. */
export function useReplay(total: number) {
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<Speed>(2);
  const posRef = useRef(0);
  posRef.current = pos;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = Math.min(total, posRef.current + (now - last) * speed);
      last = now;
      posRef.current = next;
      setPos(next);
      if (next >= total) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, total]);

  const seek = useCallback((t: number) => {
    const v = Math.max(0, Math.min(total, t));
    posRef.current = v;
    setPos(v);
  }, [total]);

  const toggle = useCallback(() => {
    if (!playing && posRef.current >= total) seek(0);
    setPlaying((p) => !p);
  }, [playing, seek, total]);

  const restart = useCallback(() => {
    seek(0);
    setPlaying(true);
  }, [seek]);

  return { pos, playing, speed, setSpeed, seek, toggle, restart, pause: () => setPlaying(false) };
}
