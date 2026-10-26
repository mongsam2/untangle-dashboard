import type { RunListItem } from '../../api/types';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ChevronRight } from '../../components/icons';
import { caseTitle } from '../../lib/cases';
import { fmtCost, fmtInt, fmtMs, fmtStamp } from '../../lib/format';
import { askLabel, RUN_STATUS, rowStyleOf, SOURCE, sourceOf } from '../../lib/status';
import s from './RunTable.module.css';

interface RunTableProps {
  title: string;
  items: RunListItem[];
  selectedId: string | null;
  onOpen: (id: string) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

/** 목록·제목에 쓰는 한 줄 요약. 테스트는 케이스 제목, 실제 요청은 입력 미리보기다. */
export function summaryOf(r: RunListItem): string {
  return r.test_case_id ? caseTitle(r.test_case_id, r.input_preview) : r.input_preview || '(입력 없음)';
}

export function RunTable({ title, items, selectedId, onOpen, hasMore, loadingMore, onLoadMore }: RunTableProps) {
  return (
    <div className={`card ${s.card}`}>
      <div className={s.head}>
        <span className={s.title}>{title}</span>
      </div>
      <div className={s.scroll}>
        <div className={s.table}>
          <div className={`${s.row} ${s.header}`}>
            <span className="th">시각</span>
            <span className="th">구분</span>
            <span className="th">내용 요약</span>
            <span className="th">응답</span>
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
                key={r.turn_id}
                type="button"
                className={s.row}
                style={rowStyleOf(r.status, selectedId === r.turn_id)}
                title={st.label}
                aria-label={(r.test_case_id ? r.test_case_id + ' ' : '') + summary + ', ' + st.label + ', 상세 보기'}
                onClick={() => onOpen(r.turn_id)}
              >
                <span className={`mono ${s.time}`}>{fmtStamp(r.started_at)}</span>
                <span>
                  <Badge bg={src.bg} fg={src.fg} border={src.border}>
                    {src.label}
                  </Badge>
                </span>
                <span className={s.summary} title={'사용자 입력: ' + r.input_preview}>
                  {r.test_case_id && <span className={`mono ${s.caseId}`}>{r.test_case_id}</span>}
                  <span className={s.ellipsis}>{summary}</span>
                </span>
                <span className={s.ask}>{r.status === 'normal' || r.status === 'tool_failed' || r.status === 'limit_exceeded' ? askLabel(r.ask_type, r.question_count, r.proposal_count) : st.label}</span>
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
      {hasMore && onLoadMore && (
        <div className={s.more}>
          <Button variant="outline" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? '불러오는 중…' : '더 보기'}
          </Button>
        </div>
      )}
    </div>
  );
}
