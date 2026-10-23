import { fmtPct } from '../../lib/format';
import type { GuardRow } from './statsModel';
import s from './Tables.module.css';

// 가드레일별 검사·차단 건수. 차단은 정상 동작(막아야 할 것을 막음)이라 실패색 대신 줄무늬로 표시한다.
export function GuardrailTable({ rows }: { rows: GuardRow[] }) {
  return (
    <div className={s.scroll}>
      <div className={s.table} style={{ minWidth: 600 }}>
        <div className={`${s.row} ${s.guards} ${s.header}`}>
          <span className="th">층</span>
          <span className="th">가드레일</span>
          <span className={`th ${s.num}`}>검사</span>
          <span className={`th ${s.num}`}>차단</span>
          <span className="th">차단 비율</span>
          <span />
        </div>
        {rows.map((r) => (
          <div key={r.layer + r.name} className={`${s.row} ${s.guards}`}>
            <span className={s.muted}>{r.layer}</span>
            <span className="mono" title={r.name}>
              {r.name}
            </span>
            <span className={`mono ${s.num}`}>{r.checks}</span>
            <span className={`mono ${s.num}`}>{r.blocked}</span>
            <span className={s.bar}>
              <span className="stripes" style={{ display: 'block', height: '100%', width: (r.rate * 100).toFixed(1) + '%' }} />
            </span>
            <span className={`mono ${s.rate}`}>{fmtPct(r.rate)}</span>
          </div>
        ))}
        {rows.length === 0 && <div className={`${s.row} ${s.muted}`}>기록된 가드레일 검사가 없어요.</div>}
      </div>
    </div>
  );
}
