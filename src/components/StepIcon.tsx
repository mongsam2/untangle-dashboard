import { ICON_BG, type IconKind } from '../lib/kinds';
import { ModelIcon, MutationIcon, QueryIcon, ReplyIcon, ServerIcon } from './icons';

const ICONS: Record<IconKind, () => JSX.Element> = {
  model: ModelIcon,
  query: QueryIcon,
  mutation: MutationIcon,
  server: ServerIcon,
  final: ReplyIcon,
};

// 단계 종류를 나타내는 32px 원형 아이콘.
export function StepIcon({ kind }: { kind: IconKind }) {
  const Icon = ICONS[kind];
  return (
    <span
      aria-hidden="true"
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', flex: 'none', background: ICON_BG[kind] }}
    >
      <Icon />
    </span>
  );
}
