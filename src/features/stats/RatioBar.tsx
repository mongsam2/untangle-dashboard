import s from './RatioBar.module.css';
import type { ShareSeg } from './statsModel';

// 비율 막대와 범례.
export function RatioBar({ segs }: { segs: ShareSeg[] }) {
  return (
    <>
      <div className={s.track}>
        {segs.map((g) => (
          <div key={g.label} title={g.title} className={s.seg} style={{ width: g.pct + '%', background: g.color }} />
        ))}
      </div>
      <div className={s.legend}>
        {segs.map((g) => (
          <span key={g.label} className={s.item}>
            <span className="dot" style={{ background: g.color }} />
            {g.label} <span className="mono">{g.value}</span>
          </span>
        ))}
      </div>
    </>
  );
}
