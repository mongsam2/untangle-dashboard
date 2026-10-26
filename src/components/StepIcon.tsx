import { ICON_BG, type IconKind } from '../lib/kinds';
import { BriefingIcon, ModelIcon, ProposalIcon, QueryIcon, ReplyIcon, ServerIcon, ShieldIcon, UserIcon } from './icons';

const ICONS: Record<IconKind, (props: Record<string, never>) => JSX.Element> = {
  model: ModelIcon,
  query: QueryIcon,
  proposal: ProposalIcon,
  briefing: BriefingIcon,
  guardrail: ShieldIcon,
  server: ServerIcon,
  final: ReplyIcon,
  user: UserIcon,
};

// 단계 종류를 나타내는 32px 둥근 아이콘.
export function StepIcon({ kind, size = 32 }: { kind: IconKind; size?: number }) {
  const Icon = ICONS[kind];
  return (
    <span
      aria-hidden="true"
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: 8, flex: 'none', background: ICON_BG[kind] }}
    >
      <Icon />
    </span>
  );
}
