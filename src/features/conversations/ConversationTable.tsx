import type { ConversationListItem } from '../../api/types';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ChevronRight } from '../../components/icons';
import { fmtCost, fmtInt, fmtMs, fmtStamp } from '../../lib/format';
import { RUN_STATUS, SOURCE } from '../../lib/status';
import s from '../runs/RunTable.module.css';
import { conversationSummary, sourceOfConversation } from './conversationModel';
import c from './ConversationTable.module.css';

interface ConversationTableProps {
  items: ConversationListItem[];
  selectedId: string | null;
  onOpen: (id: string) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

const MIXED = { label: '섞임', bg: 'var(--color-divider)', fg: 'var(--color-body)' };

// 대화 목록. 마지막 요청이 최근인 대화부터 보여주고, 주의가 필요한 턴이 있으면 행을 칠한다.
export function ConversationTable({ items, selectedId, onOpen, hasMore, loadingMore, onLoadMore }: ConversationTableProps) {
  return (
    <div className={`card ${s.card}`}>
      <div className={s.head}>
        <span className={s.title}>
          대화 {items.length}개{hasMore ? '+' : ''}
        </span>
      </div>
      <div className={s.scroll}>
        <div className={c.table}>
          <div className={`${s.row} ${c.row} ${s.header}`}>
            <span className="th">마지막 요청</span>
            <span className="th">구분</span>
            <span className="th">처음 → 마지막 입력</span>
            <span className={`th ${s.num}`}>턴</span>
            <span className={`th ${s.num}`}>호출</span>
            <span className={`th ${s.num}`}>토큰</span>
            <span className={`th ${s.num}`}>비용</span>
            <span className={`th ${s.num}`}>시간</span>
            <span />
          </div>
          {items.map((it) => {
            const kind = sourceOfConversation(it);
            const src = kind === 'mixed' ? MIXED : SOURCE[kind];
            const summary = conversationSummary(it);
            const selected = selectedId === it.conversation_id;
            const attention = it.attention_turns > 0;
            return (
              <button
                key={it.conversation_id}
                type="button"
                className={`${s.row} ${c.row}`}
                style={{
                  background: attention ? 'var(--row-tint-warn)' : selected ? 'var(--color-parchment)' : undefined,
                  boxShadow: selected ? 'inset 3px 0 0 var(--color-focus)' : undefined,
                }}
                aria-label={summary + ', 턴 ' + it.turns + '개, 대화 보기'}
                onClick={() => onOpen(it.conversation_id)}
              >
                <span className={`mono ${s.time}`}>{fmtStamp(it.last_started_at)}</span>
                <span>
                  <Badge bg={src.bg} fg={src.fg}>
                    {src.label}
                  </Badge>
                </span>
                <span className={s.summary} title={summary}>
                  <span className={s.ellipsis}>{summary}</span>
                  {attention && (
                    <Badge bg={RUN_STATUS.tool_failed.bg} fg={RUN_STATUS.tool_failed.fg} dot={RUN_STATUS.tool_failed.dot}>
                      주의 {it.attention_turns}
                    </Badge>
                  )}
                </span>
                <span className={`mono ${s.num}`}>{it.turns}</span>
                <span className={`mono ${s.num} ${s.muted}`}>
                  {it.model_calls}·{it.tool_calls}
                </span>
                <span className={`mono ${s.num}`}>{fmtInt(it.input_tokens + it.output_tokens)}</span>
                <span className={`mono ${s.num}`}>{fmtCost(it.cost_usd)}</span>
                <span className={`mono ${s.num} ${s.muted}`}>{fmtMs(it.duration_ms)}</span>
                <ChevronRight />
              </button>
            );
          })}
          {items.length === 0 && <div className={s.empty}>조건에 맞는 대화가 없어요.</div>}
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
