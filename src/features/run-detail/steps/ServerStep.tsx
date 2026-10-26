import { SERVER_DECISION } from '../../../lib/kinds';
import type { StepProps } from './ModelStep';
import { StepCard } from './StepCard';
import s from './StepCard.module.css';

export function ServerStep({ step, selected, onSelect }: StepProps) {
  const title = step.decision ? SERVER_DECISION[step.decision] : '서버 판단';
  return (
    <StepCard step={step} title={'서버 · ' + title} selected={selected} onSelect={onSelect}>
      <div className={s.note}>{step.note ?? '-'}</div>
    </StepCard>
  );
}
