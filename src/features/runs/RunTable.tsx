import type { RunListItem } from '../../api/types';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ChevronRight } from '../../components/icons';
import { fmtCost, fmtInt, fmtMs, fmtTime } from '../../lib/format';
import { RUN_STATUS, rowStyleOf, SOURCE, sourceOf } from '../../lib/status';
import s from './RunTable.module.css';
import { inputOf, summaryOf } from './summary';

interface RunTableProps {
  total: number;
  items: RunListItem[];
  selectedId: string | null;
  onOpen: (id: string) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

export function RunTable({ total, items, selectedId, onOpen, hasMore, loadingMore, onLoadMore }: RunTableProps) {
  return (
    <div className={`card ${s.card}`}>
      <div className={s.head}>
        <span className={s.title}>요청 {total}건</span>
      </div>
      <div className={s.scroll}>
        <div className={s.table}>
          <div className={`${s.row} ${s.header}`}>
            <span className="th">시각</span>
            <span className="th">구분</span>
            <span className="th">내용 요약</span>
            <span className={`th ${s.num}`}>토큰</span>
            <span className={`th ${s.num}`}>비용</span>
            <span className={`th ${s.num}`}>시간</span>
            <span />
          </div>
          {items.map((r) => {
            const src = SOURCE[sourceOf(r.test_case_id)];
            const st = RUN_STATUS[r.status];
            const summary = summaryOf(r);
            return (
              <button
                key={r.request_id}
                type="button"
                className={s.row}
                style={rowStyleOf(r.status, selectedId === r.request_id)}
                title={st.label}
                aria-label={(r.test_case_id ? r.test_case_id + ' ' : '') + summary + ', ' + st.label + ', 상세 보기'}
                onClick={() => onOpen(r.request_id)}
              >
                <span className={`mono ${s.time}`}>{fmtTime(r.started_at)}</span>
                <span>
                  <Badge bg={src.bg} fg={src.fg}>
                    {src.label}
                  </Badge>
                </span>
                <span className={s.summary} title={'사용자 입력: ' + inputOf(r)}>
                  {r.test_case_id && <span className={`mono ${s.caseId}`}>{r.test_case_id}</span>}
                  <span className={s.ellipsis}>{summary}</span>
                </span>
                <span className={`mono ${s.num}`}>{fmtInt(r.input_tokens + r.output_tokens)}</span>
                <span className={`mono ${s.num}`}>{fmtCost(r.cost_usd)}</span>
                <span className={`mono ${s.num} ${s.muted}`}>{fmtMs(r.duration_ms)}</span>
                <ChevronRight />
              </button>
            );
          })}
          {items.length === 0 && <div className={s.empty}>필터에 맞는 요청이 없어요.</div>}
        </div>
      </div>
      {hasMore && (
        <div className={s.more}>
          <Button variant="pill" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? '불러오는 중…' : '더 보기'}
          </Button>
        </div>
      )}
    </div>
  );
}
