import { Badge } from '../../../components/Badge';
import { fmtMs } from '../../../lib/format';
import { GUARD_LAYER } from '../../../lib/kinds';
import { guardTone } from '../../../lib/status';
import type { StepProps } from './ModelStep';
import s from './StepCard.module.css';

// 가드레일 단계. 구조도의 차단봉처럼 줄무늬 막대를 세우고 한 줄로 짧게 보인다.
export function GuardrailStep({ step, selected, onSelect }: StepProps) {
  const tone = guardTone(step.passed);
  const blocked = step.passed === false;
  return (
    <button
      type="button"
      className={`${s.gate} ${blocked ? s.gateBlocked : ''} ${selected ? s.selected : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
      title={(step.guardrail_layer ? GUARD_LAYER[step.guardrail_layer].label : '가드레일') + ' · ' + (step.guardrail_name ?? '')}
    >
      <span className={`stripes ${s.gateBar}`} aria-hidden="true" />
      <span className={s.gateRow}>
        <span className={s.gateLayer}>{step.guardrail_layer ? GUARD_LAYER[step.guardrail_layer].short : '-'}</span>
        <span className={`mono ${s.gateName}`}>{step.guardrail_name}</span>
        <Badge bg={tone.bg} fg={tone.fg} dot={tone.dot}>
          {tone.label}
        </Badge>
        {step.note && <span className={s.gateNote}>{step.note}</span>}
        <span className={`mono ${s.gateMeta}`}>
          #{step.seq} · {fmtMs(step.duration_ms)}
        </span>
      </span>
    </button>
  );
}
