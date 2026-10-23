import s from './Charts.module.css';
import type { ShareSeg } from './statsModel';

export function RatioBar({ segs }: { segs: ShareSeg[] }) {
  return (
    <div className={s.ratio}>
      <div className={s.track}>
        {segs.map((g) => (
          <div key={g.label} className={s.seg} title={g.title} style={{ width: g.pct + '%', background: g.color }} />
        ))}
      </div>
      <div className={s.legend}>
        {segs.map((g) => (
          <span key={g.label} className={s.legendItem}>
            <span className="dot" style={{ background: g.color }} />
            {g.label} · <span className="mono">{g.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
