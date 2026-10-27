// 선 아이콘. 선 색은 currentColor를 따른다.
const common = { 'aria-hidden': true as const, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function CloseIcon() {
  return (
    <svg {...common} width="18" height="18" strokeWidth="2">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg {...common} width={size} height={size} strokeWidth="2.5">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function ChevronRight() {
  return (
    <svg {...common} width="16" height="16" strokeWidth="2" style={{ color: 'var(--icon-secondary)' }}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function FilterIcon() {
  return (
    <svg {...common} width="16" height="16" strokeWidth="1.8">
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
    </svg>
  );
}

export function ModelIcon({ color = 'var(--icon-inverse)' }: { color?: string }) {
  return (
    <svg {...common} width="18" height="18" strokeWidth="1.8" style={{ color }}>
      <path d="M11 3.5l1.9 5.1 5.1 1.9-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z" />
      <path d="M18.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </svg>
  );
}

export function QueryIcon() {
  return (
    <svg {...common} width="18" height="18" strokeWidth="1.8" style={{ color: 'var(--data-query)' }}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </svg>
  );
}

export function ProposalIcon() {
  return (
    <svg {...common} width="18" height="18" strokeWidth="1.8" style={{ color: 'var(--data-proposal)' }}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

export function BriefingIcon() {
  return (
    <svg {...common} width="18" height="18" strokeWidth="1.8" style={{ color: 'var(--data-briefing)' }}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  );
}

export function ShieldIcon({ color = 'var(--guard-fg)' }: { color?: string }) {
  return (
    <svg {...common} width="18" height="18" strokeWidth="1.8" style={{ color }}>
      <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function ServerIcon() {
  return (
    <svg {...common} width="18" height="18" strokeWidth="1.8" style={{ color: 'var(--icon-secondary)' }}>
      <rect x="4" y="4" width="16" height="6" rx="1.5" />
      <rect x="4" y="14" width="16" height="6" rx="1.5" />
      <path d="M8 7h.01M8 17h.01" />
    </svg>
  );
}

export function ReplyIcon() {
  return (
    <svg {...common} width="18" height="18" strokeWidth="1.8" style={{ color: 'var(--data-success)' }}>
      <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    </svg>
  );
}

export function UserIcon() {
  return (
    <svg {...common} width="18" height="18" strokeWidth="1.8" style={{ color: 'var(--icon-secondary)' }}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

export function PlayIcon({ size = 14, path = 'M7 5v14l12-7z' }: { size?: number; path?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d={path} />
    </svg>
  );
}
