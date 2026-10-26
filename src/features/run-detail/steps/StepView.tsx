import { GuardrailStep } from './GuardrailStep';
import { ModelStep, type StepProps } from './ModelStep';
import { ServerStep } from './ServerStep';
import { ToolStep } from './ToolStep';

export function StepView(props: StepProps) {
  switch (props.step.kind) {
    case 'model':
      return <ModelStep {...props} />;
    case 'tool':
      return <ToolStep {...props} />;
    case 'guardrail':
      return <GuardrailStep {...props} />;
    case 'server':
      return <ServerStep {...props} />;
  }
}
