import { useId, type ReactNode } from 'react';
import s from './Collapsible.module.css';

interface CollapsibleProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  /** 본문을 카드 가장자리까지 붙인다(표처럼 꽉 채우는 내용). */
  flush?: boolean;
  gap?: 16 | 24;
  children: ReactNode;
}

// 집계 블록. 제목 줄을 눌러 접고 편다.
export function Collapsible({ title, open, onToggle, flush, gap = 16, children }: CollapsibleProps) {
  const id = useId();
  return (
    <section className={`card ${flush ? s.flush : s.padded}`} style={flush ? undefined : { gap }}>
      <button type="button" className={`${s.head} ${flush ? s.headFlush : ''}`} aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <span className={s.title}>{title}</span>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${s.chev} ${open ? s.chevOpen : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div id={id} className={flush ? undefined : s.body} style={flush ? undefined : { gap }}>
          {children}
        </div>
      )}
    </section>
  );
}
