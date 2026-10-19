import { CASE_CATALOG } from '../../lib/cases';
import { ChevronRight } from '../../components/icons';
import s from './CaseTable.module.css';
import type { CaseRow } from './statsModel';

interface CaseTableProps {
  rows: CaseRow[];
  selectedId: string | null;
  onOpen: (id: string) => void;
}

export function CaseTable({ rows, selectedId, onOpen }: CaseTableProps) {
  return (
    <div className={s.scroll}>
      <div className={s.table}>
        <div className={`${s.row} ${s.header}`}>
          <span className="th">케이스</span>
          <span className="th">테스트 내용</span>
          <span className={`th ${s.num}`}>실행</span>
          <span className={`th ${s.num}`}>평균 모델 호출</span>
          <span className={`th ${s.num}`}>평균 토큰</span>
          <span className={`th ${s.num}`}>평균 비용</span>
          <span className={`th ${s.num}`}>도구 실패</span>
          <span className={`th ${s.num}`}>반영 미확인</span>
          <span />
        </div>
        {rows.map((c) => {
          const input = CASE_CATALOG[c.id]?.input;
          return (
            <button key={c.id} type="button" className={`${s.row} ${selectedId === c.id ? s.selected : ''}`} aria-label={c.id + ' ' + c.title + ' 상세 보기'} onClick={() => onOpen(c.id)}>
              <span>
                <span className={`mono ${s.badge}`}>{c.id}</span>
              </span>
              <span className={s.title} title={input ? '예시 입력: ' + input : undefined}>
                {c.title}
              </span>
              <span className={`mono ${s.num}`}>{c.runs}</span>
              <span className={`mono ${s.num}`}>{c.avgModel}</span>
              <span className={`mono ${s.num}`}>{c.avgTokens}</span>
              <span className={`mono ${s.num}`}>{c.avgCost}</span>
              <span className={`mono ${s.num} ${c.warn ? s.bad : s.muted}`}>{c.warn}</span>
              <span className={`mono ${s.num} ${c.unknown ? s.bad : s.muted}`}>{c.unknown}</span>
              <ChevronRight />
            </button>
          );
        })}
      </div>
    </div>
  );
}
