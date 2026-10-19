import { KDE_H, KDE_W, type KdeModel } from './kde';
import s from './TokenDensity.module.css';

// 요청당 토큰 밀도 곡선, 중앙값 점선, 아래쪽 러그와 눈금.
export function TokenDensity({ kde }: { kde: KdeModel }) {
  return (
    <>
      <div className={s.stats}>
        <span>
          중앙값 <span className="mono">{kde.median}</span>
        </span>
        <span>
          평균 <span className="mono">{kde.mean}</span>
        </span>
        <span>
          최대 <span className="mono">{kde.max}</span>
        </span>
      </div>
      <div className={s.plot}>
        <svg role="img" aria-label={kde.aria} viewBox={`0 0 ${KDE_W} ${KDE_H}`} preserveAspectRatio="none" className={s.svg}>
          <path d={kde.area} style={{ fill: 'var(--data-query)', fillOpacity: 0.14 }} />
          <path d={kde.medianLine} fill="none" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" style={{ stroke: 'var(--color-muted)' }} />
          <path d={kde.line} fill="none" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ stroke: 'var(--data-query)' }} />
          <path d={`M0,${KDE_H - 0.5} L${KDE_W},${KDE_H - 0.5}`} fill="none" strokeWidth="1" vectorEffect="non-scaling-stroke" style={{ stroke: 'var(--color-axis)' }} />
        </svg>
        {kde.rug.map((r, i) => (
          <span key={i} className={s.rug} title={r.title} style={{ left: r.x + '%' }} />
        ))}
      </div>
      <div className={s.ticks}>
        {kde.ticks.map((t) => (
          <span key={t.x} className={`mono ${s.tick}`} style={{ left: t.x + '%', transform: `translateX(${t.shift})` }}>
            {t.label}
          </span>
        ))}
      </div>
    </>
  );
}
