import { fmtInt } from '../../lib/format';
import s from './Charts.module.css';
import { areaPath, type Kde } from './kde';

const W = 960;
const H = 160;

export function TokenDensity({ kde }: { kde: Kde | null }) {
  if (!kde) return <span className={s.statsRow}>모델을 부른 요청이 없어 분포를 그릴 수 없어요.</span>;
  const xMax = kde.xs[kde.xs.length - 1] || 1;
  const meanX = (kde.mean / xMax) * W;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((r) => fmtInt(xMax * r));
  return (
    <div className={s.density}>
      <div className={s.statsRow}>
        <span>
          평균 <strong className="mono">{fmtInt(kde.mean)}</strong>
        </span>
        <span>
          중앙값 <strong className="mono">{fmtInt(kde.median)}</strong>
        </span>
        <span>
          최대 <strong className="mono">{fmtInt(kde.max)}</strong>
        </span>
        <span>
          표준편차 <strong className="mono">{fmtInt(kde.sd)}</strong>
        </span>
        <span>
          표본 <strong className="mono">{kde.n}</strong>
        </span>
      </div>
      <svg className={s.svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="요청당 토큰 분포 곡선">
        <path d={areaPath(kde, W, H)} fill="var(--data-query)" fillOpacity="0.9" />
        <line x1={meanX} x2={meanX} y1="0" y2={H} stroke="var(--text-primary)" strokeDasharray="4 4" />
        <text x={meanX + 6} y="14" fontSize="11" fill="var(--text-primary)" fontFamily="var(--font-mono)">
          평균 {fmtInt(kde.mean)}
        </text>
      </svg>
      <div className={`mono ${s.axis}`}>
        {ticks.map((t, i) => (
          <span key={i}>{t}{i === ticks.length - 1 ? ' 토큰' : ''}</span>
        ))}
      </div>
    </div>
  );
}
