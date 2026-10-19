import type { RunListItem } from '../../api/types';
import { ChevronRight } from '../../components/icons';
import { fmtCost, fmtInt, fmtMs, fmtStamp } from '../../lib/format';
import { RUN_STATUS, rowStyleOf } from '../../lib/status';
import s from './CaseRunTable.module.css';

export function CaseRunTable({ runs, onOpen }: { runs: RunListItem[]; onOpen: (id: string) => void }) {
  return (
    <div className={`card ${s.card}`}>
      <div className={s.head}>
        <span className={s.title}>실행 {runs.length}건</span>
      </div>
      <div className={s.scroll}>
        <div className={s.table}>
          <div className={`${s.row} ${s.header}`}>
            <span className="th">시각</span>
            <span className={`th ${s.num}`}>모델 호출</span>
            <span className={`th ${s.num}`}>토큰</span>
            <span className={`th ${s.num}`}>비용</span>
            <span className={`th ${s.num}`}>시간</span>
            <span />
          </div>
          {runs.map((r) => {
            const st = RUN_STATUS[r.status];
            return (
              <button
                key={r.request_id}
                type="button"
                className={s.row}
                style={rowStyleOf(r.status, false)}
                title={st.label}
                aria-label={fmtStamp(r.started_at) + ' 실행, ' + st.label + ', 상세 보기'}
                onClick={() => onOpen(r.request_id)}
              >
                <span className={`mono ${s.time}`}>{fmtStamp(r.started_at)}</span>
                <span className={`mono ${s.num}`}>{r.model_calls}</span>
                <span className={`mono ${s.num}`}>{fmtInt(r.input_tokens + r.output_tokens)}</span>
                <span className={`mono ${s.num}`}>{fmtCost(r.cost_usd)}</span>
                <span className={`mono ${s.num} ${s.muted}`}>{fmtMs(r.duration_ms)}</span>
                <ChevronRight />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
