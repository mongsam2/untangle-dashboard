import s from './KpiHero.module.css';

export interface KpiTile {
  label: string;
  value: string;
  sub: string;
}

// 페이지 위쪽의 어두운 KPI 띠.
export function KpiHero({ tiles }: { tiles: KpiTile[] }) {
  return (
    <section className={s.hero}>
      <div className={s.grid}>
        {tiles.map((t) => (
          <div key={t.label} className={s.tile}>
            <span className={s.label}>{t.label}</span>
            <span className={s.value}>{t.value}</span>
            <span className={s.sub}>{t.sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
