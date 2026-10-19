import type { CSSProperties, ReactNode } from 'react';
import s from './Badge.module.css';

interface BadgeProps {
  bg?: string;
  fg?: string;
  /** 점 색. 주면 글자 앞에 점을 찍는다. */
  dot?: string;
  mono?: boolean;
  ring?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function Badge({ bg, fg, dot, mono, ring, className, style, children }: BadgeProps) {
  const cls = [s.badge, mono ? 'mono' : '', ring ? s.ring : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <span className={cls} style={{ background: bg, color: fg, ...style }}>
      {dot && <span className="dot" style={{ background: dot }} />}
      {children}
    </span>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className="dot" style={{ background: color }} />;
}
