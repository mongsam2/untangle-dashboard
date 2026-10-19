import s from './ToolDonuts.module.css';
import type { Donut } from './statsModel';

export function ToolDonuts({ donuts }: { donuts: Donut[] }) {
  return (
    <div className={s.grid}>
      {donuts.map((g) => (
        <div key={g.name} className={s.group} title={g.title}>
          <span className={s.name}>{g.name}</span>
          <div className={s.row}>
            <div aria-hidden="true" className={s.ring} style={{ background: g.ring }}>
              <div className={s.hole}>
                <span className={`mono ${s.total}`}>{g.total}</span>
                <span className={s.unit}>{g.unit}</span>
              </div>
            </div>
            <div className={s.items}>
              {g.items.map((it) => (
                <div key={it.label} className={s.item}>
                  <span className="dot" style={{ background: it.color }} />
                  <span className={`${g.mono ? 'mono' : ''} ${s.label}`}>{it.label}</span>
                  <span className={`mono ${s.count}`}>{it.count}</span>
                  <span className={`mono ${s.pct}`}>{it.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
