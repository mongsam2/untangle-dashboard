import type { ReactNode } from 'react';
import { Button } from './Button';
import { CopyId } from './CopyId';
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
      <Button variant="icon" className={s.close} aria-label="상세 닫기" onClick={onClose}>
        <CloseIcon />
      </Button>
      {children}
    </aside>
  );
}

/** 상세 패널 위쪽의 흰 머리 영역. */
export function InspectorHead({ children }: { children: ReactNode }) {
  return (
    <section className={s.head}>
      <div className={s.headInner}>{children}</div>
    </section>
  );
}

export function InspectorBody({ children }: { children: ReactNode }) {
  return <div className={s.body}>{children}</div>;
}

export function InspectorMessage({ children }: { children: ReactNode }) {
  return <div className={s.message}>{children}</div>;
}

export function InspectorTitle({ children }: { children: ReactNode }) {
  return <h1 className={s.title}>{children}</h1>;
}

export function InspectorBack({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={s.back} onClick={onClick}>
      ‹ {children}
    </button>
  );
}

export function InspectorBadges({ children }: { children: ReactNode }) {
  return <div className={s.badges}>{children}</div>;
}

export interface MetaItem {
  label: string;
  value: string;
  mono?: boolean;
  /** UUID처럼 긴 값. 줄여 보이고 누르면 복사한다. */
  id?: boolean;
}

export function MetaGrid({ items }: { items: MetaItem[] }) {
  return (
    <div className={s.meta}>
      {items.map((m) => (
        <div key={m.label} className={s.metaItem}>
          <span className={s.metaLabel}>{m.label}</span>
          {m.id ? (
            <CopyId id={m.value} className={s.metaValue} />
          ) : (
            <span className={`${m.mono ? 'mono' : ''} ${s.metaValue}`} title={m.value}>
              {m.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
