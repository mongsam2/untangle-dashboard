import type { DisplayStep } from '../displaySteps';
import { ModelStep } from './ModelStep';
import { ServerStep } from './ServerStep';
import { ToolStep } from './ToolStep';

/** 단계 종류에 맞는 카드. 요청 인스펙터와 대화 인스펙터가 같이 쓴다. */
export function StepView({ step, selected, onSelect }: { step: DisplayStep; selected: boolean; onSelect: () => void }) {
  if (step.kind === 'model') return <ModelStep step={step} selected={selected} onSelect={onSelect} />;
  if (step.kind === 'tool') return <ToolStep step={step} selected={selected} onSelect={onSelect} />;
  return <ServerStep step={step} selected={selected} onSelect={onSelect} />;
}
