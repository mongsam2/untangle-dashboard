import type { ReactNode } from 'react';
import { StepIcon } from '../../../components/StepIcon';
import { fmtCost, fmtMs } from '../../../lib/format';
import { iconKindOf } from '../../../lib/kinds';
import type { DisplayStep } from '../displaySteps';
import s from './StepCard.module.css';

interface StepCardProps {
  step: DisplayStep;
  title: string;
  mono?: boolean;
  /** 제목 옆에 붙는 종류·상태 표시 */
  tags?: ReactNode;
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}

// 단계 카드의 공통 머리. 누르면 선택되고 오른쪽 토큰 표의 같은 행이 강조된다.
export function StepCard({ step, title, mono, tags, selected, onSelect, children }: StepCardProps) {
  const server = step.kind === 'server';
  return (
    <div className={`card ${server ? s.server : ''} ${selected ? s.selected : ''}`}>
      <button type="button" className={s.head} aria-pressed={selected} onClick={onSelect}>
        <StepIcon kind={iconKindOf(step.kind, step.tool_kind)} />
        <span className={`${mono ? 'mono' : ''} ${s.title} ${server ? s.titleServer : ''}`}>{title}</span>
        {tags}
        <span className={s.meta}>
          <span className="mono">#{step.seq}</span>
          <span className="mono">{fmtMs(step.duration_ms)}</span>
          {step.kind === 'model' && <span className="mono">{fmtCost(step.cost_usd)}</span>}
        </span>
      </button>
      <div className={s.body}>{children}</div>
    </div>
  );
}
