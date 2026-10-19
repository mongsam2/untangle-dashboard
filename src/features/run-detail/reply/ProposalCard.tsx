import { Badge } from '../../../components/Badge';
import s from './ProposalCard.module.css';
import type { ProposalCardModel } from './proposalCard';

// 응답의 proposal 화면을 앱에서 보이는 제안서 카드 모양으로 그린다.
export function ProposalCard({ card }: { card: ProposalCardModel }) {
  return (
    <div className={s.card}>
      <div className={s.top}>
        <Badge bg="var(--color-divider)" fg="var(--color-ink)">
          {card.typeLabel}
        </Badge>
        {card.applied ? (
          <Badge bg="var(--color-ink)" fg="var(--color-canvas)">
            반영됨
          </Badge>
        ) : (
          <Badge bg="var(--color-divider)" fg="var(--color-ink)">
            수락 대기
          </Badge>
        )}
        <span className={`mono ${s.id}`} title={card.id}>
          {card.id}
        </span>
      </div>
      <div className={s.goal}>
        <span className={s.title}>{card.title}</span>
        <span className={s.meta}>{card.meta}</span>
      </div>
      <span className={s.reason}>{card.reason}</span>
      <div className={s.items}>
        {card.items.map((it) => (
          <div key={it.n} className={s.item}>
            <span className={`mono ${s.n}`}>{it.n}</span>
            <span className={`${s.itemTitle} ${it.done ? s.done : ''}`}>{it.title}</span>
            <span className={s.cat}>{it.category}</span>
            {it.mark && (
              <Badge bg="var(--color-canvas)" fg="var(--color-ink)" ring>
                {it.mark}
              </Badge>
            )}
          </div>
        ))}
      </div>
      {card.removed.length > 0 && (
        <div className={s.removed}>
          <span className="th">빠지는 과제</span>
          {card.removed.map((r, i) => (
            <div key={i} className={s.removedLine}>
              <span className={s.strike}>{r.title}</span> · {r.why}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
