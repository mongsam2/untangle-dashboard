import { fmtInt } from '../../../lib/format';
import { nextActionLabel, TOK } from '../../../lib/kinds';
import { summaryText, tokensOf, type DisplayStep } from '../displaySteps';
import { StepCard } from './StepCard';
import s from './StepCard.module.css';

interface StepProps {
  step: DisplayStep;
  selected: boolean;
  onSelect: () => void;
}

export function ModelStep({ step, selected, onSelect }: StepProps) {
  const t = tokensOf(step);
  const tokens = [
    { name: '비캐시 입력', value: t.fresh, color: TOK.fresh },
    { name: '캐시 입력', value: t.cached, color: TOK.cached },
    { name: '답변 출력', value: t.answer, color: TOK.answer },
    { name: '추론 출력', value: t.reasoning, color: TOK.reason },
  ];
  return (
    <StepCard step={step} title={'모델 호출 #' + step.modelIndex} selected={selected} onSelect={onSelect}>
      <div className={s.legend}>
        {tokens.map((x) => (
          <span key={x.name} className={s.legendItem}>
            <span className="dot" style={{ background: x.color }} />
            {x.name} <span className="mono">{fmtInt(x.value)}</span>
          </span>
        ))}
      </div>
      <div className={s.summaryBox}>
        <span className={s.summaryTitle}>추론 요약</span>
        <span className={s.summaryText}>{summaryText(step)}</span>
        {hasTranslation(step) && (
          <details className={s.original}>
            <summary>원문 보기</summary>
            <span className={s.originalText}>{step.reasoning_summary}</span>
          </details>
        )}
      </div>
      {step.next_action && <div className={s.next}>{nextActionLabel(step.next_action)}</div>}
    </StepCard>
  );
}

function hasTranslation(step: DisplayStep): boolean {
  return !!step.reasoning_summary_ko && step.reasoning_summary_ko !== step.reasoning_summary;
}

export type { StepProps };
