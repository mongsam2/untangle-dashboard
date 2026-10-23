import { Badge } from '../../components/Badge';
import { ChevronRight } from '../../components/icons';
import { RUN_STATUS } from '../../lib/status';
import type { CaseRow } from './statsModel';
import s from './Tables.module.css';

interface CaseTableProps {
  rows: CaseRow[];
  selectedId: string | null;
  onOpen: (id: string) => void;
}

export function CaseTable({ rows, selectedId, onOpen }: CaseTableProps) {
  return (
    <div className={s.scroll}>
      <div className={s.table} style={{ minWidth: 760, padding: '0 12px 8px' }}>
        <div className={`${s.row} ${s.cases} ${s.header}`}>
          <span className="th">케이스</span>
          <span className="th">검증 사례</span>
          <span className={`th ${s.num}`}>실행</span>
          <span className={`th ${s.num}`}>평균 모델 호출</span>
          <span className={`th ${s.num}`}>평균 토큰</span>
          <span className={`th ${s.num}`}>평균 비용</span>
          <span className="th">결과</span>
          <span />
        </div>
        {rows.map((r) => (
          <button key={r.id} type="button" className={`${s.row} ${s.cases} ${s.caseBtn} ${selectedId === r.id ? s.selected : ''}`} onClick={() => onOpen(r.id)}>
            <span className={`mono ${s.muted}`}>{r.id}</span>
            <span>{r.title}</span>
            <span className={`mono ${s.num}`}>{r.runs}</span>
            <span className={`mono ${s.num}`}>{r.avgModel}</span>
            <span className={`mono ${s.num}`}>{r.avgTokens}</span>
            <span className={`mono ${s.num}`}>{r.avgCost}</span>
            <span style={{ display: 'flex', gap: 6 }}>
              {r.worst ? (
                <Badge bg={RUN_STATUS[r.worst].bg} fg={RUN_STATUS[r.worst].fg} dot={RUN_STATUS[r.worst].dot}>
                  {RUN_STATUS[r.worst].label} {r.attention}
                </Badge>
              ) : (
                <Badge bg={RUN_STATUS.normal.bg} fg={RUN_STATUS.normal.fg} dot={RUN_STATUS.normal.dot}>
                  정상 {r.normal}
                </Badge>
              )}
            </span>
            <ChevronRight />
          </button>
        ))}
      </div>
    </div>
  );
}
