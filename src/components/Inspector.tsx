import type { ReactNode } from 'react';
import { Button } from './Button';
import { CloseIcon } from './icons';
import s from './Inspector.module.css';

interface InspectorProps {
  label: string;
  onClose: () => void;
  children: ReactNode;
}

// 오른쪽에 붙는 상세 패널. 본문과 따로 스크롤된다.
export function Inspector({ label, onClose, children }: InspectorProps) {
  return (
    <aside className={s.aside} aria-label={label}>
      <Button variant="icon" tone="glass" className={s.close} aria-label="상세 닫기" onClick={onClose}>
        <CloseIcon />
      </Button>
      {children}
    </aside>
  );
}

/** 상세 패널 위쪽의 어두운 머리 영역. */
export function InspectorHero({ children }: { children: ReactNode }) {
  return (
    <section className={s.hero}>
      <div className={s.heroInner}>{children}</div>
    </section>
  );
}

export function InspectorBody({ children }: { children: ReactNode }) {
  return <div className={s.body}>{children}</div>;
}

export function InspectorMessage({ children }: { children: ReactNode }) {
  return <div className={s.message}>{children}</div>;
}
