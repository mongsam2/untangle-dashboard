import type { ReactNode } from 'react';
import s from './Page.module.css';

export function PageMain({ children }: { children: ReactNode }) {
  return <main className={s.main}>{children}</main>;
}

export function Notice({ children }: { children: ReactNode }) {
  return <div className={s.notice}>{children}</div>;
}
