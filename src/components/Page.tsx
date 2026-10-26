import type { ReactNode } from 'react';
import s from './Page.module.css';

export function PageMain({ children }: { children: ReactNode }) {
  return <main className={s.main}>{children}</main>;
}

/** 페이지 제목 띠. 전역 메뉴 바로 아래에 붙는다. */
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className={s.header}>
      <div className={s.headerInner}>
        <h1 className={s.title}>{title}</h1>
        {subtitle && <span className={s.subtitle}>{subtitle}</span>}
      </div>
    </div>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <div className={`card ${s.notice}`}>{children}</div>;
}

export interface KpiTile {
  label: string;
  value: string;
  sub: string;
}

/** 페이지 위쪽의 KPI 카드 줄. 숫자는 서버 요약값을 그대로 쓴다. */
export function KpiRow({ tiles }: { tiles: KpiTile[] }) {
  return (
    <section className={s.kpis} aria-label="요약 수치">
      {tiles.map((t) => (
        <div key={t.label} className={`card ${s.kpi}`}>
          <span className={s.kpiLabel}>{t.label}</span>
          <span className={`mono ${s.kpiValue}`}>{t.value}</span>
          <span className={s.kpiSub}>{t.sub}</span>
        </div>
      ))}
    </section>
  );
}
