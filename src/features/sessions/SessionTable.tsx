import type { SessionListItem } from '../../api/types';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ChevronRight } from '../../components/icons';
import { fmtCost, fmtInt, fmtStamp } from '../../lib/format';
import { RUN_STATUS, rowStyleOf, SOURCE } from '../../lib/status';
import s from './SessionTable.module.css';

interface SessionTableProps {
  title: string;
  items: SessionListItem[];
  selectedId: string | null;
  onOpen: (id: string) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

export function SessionTable({ title, items, selectedId, onOpen, hasMore, loadingMore, onLoadMore }: SessionTableProps) {
  return (
    <div className={`card ${s.card}`}>
      <div className={s.head}>
        <span className={s.title}>{title}</span>
      </div>
      <div className={s.scroll}>
        <div className={s.table}>
          <div className={`${s.row} ${s.header}`}>
            <span className="th">마지막 턴</span>
            <span className="th">구분</span>
            <span className="th">마지막 입력</span>
            <span className={`th ${s.num}`}>턴</span>
            <span className={`th ${s.num}`}>호출</span>
            <span className={`th ${s.num}`}>토큰</span>
            <span className={`th ${s.num}`}>비용</span>
            <span className="th">마지막 상태</span>
            <span />
          </div>
          {items.map((c) => {
            const src = SOURCE[c.test_turns > 0 ? 'test' : 'real'];
            const st = RUN_STATUS[c.last_status];
            // 주의 턴이 있으면 마지막 상태가 정상이어도 연하게 칠해 눈에 띄게 한다.
            const tint = c.attention_turns > 0 && c.last_status === 'normal' ? 'tool_failed' : c.last_status;
            return (
              <button key={c.session_id} type="button" className={s.row} style={rowStyleOf(tint, selectedId === c.session_id)} aria-label={c.last_input_preview + ', 턴 ' + c.turns + ', 상세 보기'} onClick={() => onOpen(c.session_id)}>
                <span className={`mono ${s.time}`}>{fmtStamp(c.last_started_at)}</span>
                <span>
                  <Badge bg={src.bg} fg={src.fg} border={src.border}>
                    {src.label}
                  </Badge>
                </span>
                <span className={s.preview} title={c.last_input_preview}>
                  {c.test_case_id && <span className={`mono ${s.caseId}`}>{c.test_case_id}</span>}
                  <span className={s.ellipsis}>{c.last_input_preview || '(입력 없음)'}</span>
                  {c.attention_turns > 0 && (
                    <Badge bg="var(--surface-warning)" fg="var(--text-warning)">
                      주의 {c.attention_turns}
                    </Badge>
                  )}
                </span>
                <span className={`mono ${s.num}`}>{c.turns}</span>
                <span className={`mono ${s.num} ${s.muted}`} title="모델 호출 · 도구 호출">
                  {c.model_calls}·{c.tool_calls}
                </span>
                <span className={`mono ${s.num}`}>{fmtInt(c.input_tokens + c.output_tokens)}</span>
                <span className={`mono ${s.num}`}>{fmtCost(c.cost_usd)}</span>
                <span>
                  <Badge bg={st.bg} fg={st.fg} dot={st.dot}>
                    {st.label}
                  </Badge>
                </span>
                <ChevronRight />
              </button>
            );
          })}
          {items.length === 0 && <div className={s.empty}>조건에 맞는 대화가 없어요.</div>}
        </div>
      </div>
      {hasMore && (
        <div className={s.more}>
          <Button variant="outline" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? '불러오는 중…' : '더 보기'}
          </Button>
        </div>
      )}
    </div>
  );
}
