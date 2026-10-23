import { fmtPct } from '../../lib/format';
import type { ToolRow } from './statsModel';
import s from './Tables.module.css';

export function ToolTable({ rows }: { rows: ToolRow[] }) {
  return (
    <div className={s.scroll}>
      <div className={s.table} style={{ minWidth: 640 }}>
        <div className={`${s.row} ${s.tools} ${s.header}`}>
          <span />
          <span className="th">도구</span>
          <span className="th">종류</span>
          <span className={`th ${s.num}`}>호출</span>
          <span className={`th ${s.num}`}>실패</span>
          <span className={`th ${s.num}`}>평균 시간</span>
          <span className="th">실패율</span>
        </div>
        {rows.map((r) => (
          <div key={r.name} className={`${s.row} ${s.tools}`}>
            <span className="dot" style={{ background: r.color }} />
            <span className="mono">{r.name}</span>
            <span className={s.muted}>{r.kind}</span>
            <span className={`mono ${s.num}`}>{r.count}</span>
            <span className={`mono ${s.num} ${r.fails ? s.rateBad : ''}`}>{r.fails}</span>
            <span className={`mono ${s.num} ${s.muted}`}>{r.avgMs}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={s.bar} style={{ flex: '1 1 auto' }}>
                <span className={s.fill} style={{ display: 'block', width: (r.rate * 100).toFixed(1) + '%' }} />
              </span>
              <span className={`mono ${s.rate} ${r.rate ? s.rateBad : ''}`} style={{ width: 48 }}>
                {fmtPct(r.rate)}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
