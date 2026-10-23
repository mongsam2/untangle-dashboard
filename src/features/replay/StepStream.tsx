import { useEffect, useRef, type ReactNode } from 'react';
import type { DisplayStep } from '../run-detail/displaySteps';
import { StepView } from '../run-detail/steps/StepView';
import s from './Replay.module.css';

interface StepStreamProps {
  groups: { key: string; label?: string; steps: DisplayStep[] }[];
  /** 아직 아무 단계도 드러나지 않았을 때 보이는 안내. */
  empty: ReactNode;
}

// 재생되며 쌓이는 단계 카드. 상세 패널과 같은 카드를 쓰되 선택 기능은 없다.
export function StepStream({ groups, empty }: StepStreamProps) {
  const ref = useRef<HTMLDivElement>(null);
  const count = groups.reduce((n, g) => n + g.steps.length, 0);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);
  return (
    <div ref={ref} className={s.stream} aria-label="단계 흐름" aria-live="polite">
      {count === 0 && <span className={s.streamEmpty}>{empty}</span>}
      {groups.map((g) =>
        g.steps.length === 0 ? null : (
          <div key={g.key} style={{ display: 'contents' }}>
            {g.label && <div className={s.turnDivider}>{g.label}</div>}
            {g.steps.map((step) => (
              <div key={step.seq} className={s.stepEnter}>
                <StepView step={step} selected={false} onSelect={() => undefined} />
              </div>
            ))}
          </div>
        ),
      )}
    </div>
  );
}
