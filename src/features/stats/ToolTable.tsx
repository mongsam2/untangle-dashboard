import s from './ToolTable.module.css';
import type { ToolRow } from './statsModel';

export function ToolTable({ rows }: { rows: ToolRow[] }) {
  return (
    <div className={s.scroll}>
      <div className={s.table}>
        <div className={`${s.row} ${s.header}`}>
          <span className="th">도구</span>
          <span className="th">종류</span>
          <span className={`th ${s.num}`}>호출</span>
          <span className={`th ${s.num}`}>실패</span>
          <span className="th">실패율</span>
        </div>
        {rows.map((t) => (
          <div key={t.name} className={`${s.row} ${s.data}`}>
            <span className={`mono ${s.name}`}>
              <span className="dot" style={{ background: t.color }} />
              <span className={s.ellipsis}>{t.name}</span>
            </span>
            <span className={s.kind}>{t.kind}</span>
            <span className={`mono ${s.num}`}>{t.count}</span>
            <span className={`mono ${s.num} ${t.fails ? s.bad : s.muted}`}>{t.fails}</span>
            <span className={s.rateCell}>
              <span className={s.track}>
                <span className={s.fill} style={{ width: (t.rate * 100).toFixed(1) + '%' }} />
              </span>
              <span className={`mono ${s.rate} ${t.fails ? s.bad : s.muted}`}>{(t.rate * 100).toFixed(1)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
