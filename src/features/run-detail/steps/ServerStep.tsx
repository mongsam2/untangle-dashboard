import type { StepProps } from './ModelStep';
import { StepCard } from './StepCard';
import s from './StepCard.module.css';

export function ServerStep({ step, selected, onSelect }: StepProps) {
  return (
    <StepCard step={step} title="서버 판단" selected={selected} onSelect={onSelect}>
      <div className={s.note}>{step.note}</div>
      {/* 변경 차단은 tool 단계가 남지 않으므로 막은 도구와 인자를 여기서 보여준다. */}
      {step.decision === 'mutation_blocked' && step.tool_name && (
        <div className={s.blocked}>
          <span className="th">막은 도구</span>
          <span className={`mono ${s.blockedTool}`}>{step.tool_name}</span>
          {step.arguments && <span className="mono">{JSON.stringify(step.arguments)}</span>}
          {step.error_code && <span className="mono">· {step.error_code}</span>}
        </div>
      )}
    </StepCard>
  );
}
