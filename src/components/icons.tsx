// 프로토타입의 선 아이콘. 선 색은 currentColor를 따른다.
const common = { 'aria-hidden': true as const, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function CloseIcon() {
  return (
    <svg {...common} width="18" height="18" strokeWidth="2">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export function ChevronRight() {
  return (
    <svg {...common} width="16" height="16" strokeWidth="2" style={{ color: 'var(--color-faint)' }}>
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

export function ModelIcon() {
  return (
    <svg {...common} width="18" height="18" strokeWidth="1.8" style={{ color: 'var(--data-model)' }}>
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

export function MutationIcon() {
  return (
    <svg {...common} width="18" height="18" strokeWidth="1.8" style={{ color: 'var(--data-mutation)' }}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

export function ServerIcon() {
  return (
    <svg {...common} width="18" height="18" strokeWidth="1.8" style={{ color: 'var(--data-server)' }}>
      <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function ReplyIcon() {
  return (
    <svg {...common} width="18" height="18" strokeWidth="1.8" style={{ color: 'var(--color-ink)' }}>
      <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
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
