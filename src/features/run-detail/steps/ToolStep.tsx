import { useState } from 'react';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { JsonView } from '../../../components/JsonView';
import { KIND } from '../../../lib/kinds';
import { stepTone } from '../../../lib/status';
import { errorMessageOf } from '../displaySteps';
import type { StepProps } from './ModelStep';
import { StepCard } from './StepCard';
import s from './StepCard.module.css';

export function ToolStep({ step, selected, onSelect }: StepProps) {
  const [argsOpen, setArgsOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const kind = KIND[step.tool_kind ?? 'query'];
  const tone = stepTone(step.status);
  return (
    <StepCard
      step={step}
      title={step.tool_name ?? '-'}
      mono
      selected={selected}
      onSelect={onSelect}
      tags={
        <>
          <span className={s.kindLabel}>{kind.label} 도구</span>
          <Badge bg={tone.bg} fg={tone.fg} dot={tone.dot}>
            {tone.label}
          </Badge>
        </>
      }
    >
      {step.error_code && (
        <div className={s.error}>
          <span className={`mono ${s.errorCode}`}>{step.error_code}</span>
          <span>{errorMessageOf(step)}</span>
        </div>
      )}
      <div className={s.pills}>
        <Button variant="pill" aria-expanded={argsOpen} onClick={() => setArgsOpen((v) => !v)}>
          {argsOpen ? '인자 접기' : '인자 보기'}
        </Button>
        <Button variant="pill" aria-expanded={resOpen} onClick={() => setResOpen((v) => !v)}>
          {resOpen ? '결과 접기' : '결과 보기'}
        </Button>
      </div>
      {argsOpen && (
        <div className={s.json}>
          <span className="th">인자</span>
          <JsonView value={step.arguments ?? null} />
        </div>
      )}
      {resOpen && (
        <div className={s.json}>
          <span className="th">결과</span>
          <JsonView value={step.result ?? null} />
        </div>
      )}
    </StepCard>
  );
}
