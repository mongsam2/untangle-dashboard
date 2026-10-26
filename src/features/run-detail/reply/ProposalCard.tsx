import type { Proposal, ProposalType, Question, TodayBriefingCard } from '../../../api/types';
import { Badge } from '../../../components/Badge';
import { CheckIcon } from '../../../components/icons';
import { fmtMinutes, shortId } from '../../../lib/format';
import { KIND } from '../../../lib/kinds';
import { proposalView } from '../../../lib/proposal';
import s from './ProposalCard.module.css';

// 앱의 D11 제안 카드를 대시보드에서 다시 그린 것. 최초 상태 → 최종 상태만 비교한다.
// 바닥은 카드가 앱에 처음 도착했을 때의 모습이다. 사용자가 실제로 무엇을 눌렀는지는 기록에 없다.
export function ProposalCard({ proposal, compact }: { proposal: Proposal; compact?: boolean }) {
  const v = proposalView(proposal);
  return (
    <div className={s.card}>
      <div className={s.head}>
        <Badge bg={KIND.proposal.bg} fg={KIND.proposal.color}>
          {v.label}
        </Badge>
        <span className={s.title}>{v.title}</span>
        {!compact && (
          <span className={`mono ${s.id}`} title={proposal.proposal_id}>
            {shortId(proposal.proposal_id)}
          </span>
        )}
      </div>
      {v.lines.length > 0 && (
        <div className={s.lines}>
          {v.lines.map((l) => (
            <DiffRow key={l.field} field={l.field} before={l.before} after={l.after} />
          ))}
        </div>
      )}
      {v.subtasks.length > 0 && (
        <div className={s.subs}>
          {v.subtasks.map((st, i) => (
            <div key={i} className={`${s.sub} ${st.state === 'removed' ? s.removed : ''}`}>
              <span className={`${s.check} ${st.done ? s.checked : ''}`} aria-hidden="true" />
              <span>{st.title}</span>
              {st.state === 'new' && <span className={s.tag}>새로</span>}
              {st.state === 'renamed' && <span className={s.tag}>이전: {st.from}</span>}
              {st.state === 'removed' && <span className={`${s.tag} ${s.tagRemoved}`}>제거</span>}
            </div>
          ))}
        </div>
      )}
      {!compact && (
        <div className={s.ops}>
          {v.operations.map((op) => (
            <span key={op} className="mono">
              {op}
            </span>
          ))}
        </div>
      )}
      <CardFooter type={proposal.proposal_type} />
    </div>
  );
}

/** 앱 카드의 바닥. 추가 카드는 받는 즉시 저장되어 [되돌리기]만, 삭제는 [거절]·[삭제], 나머지는 [거절]·[수락]이다. */
function CardFooter({ type }: { type: ProposalType }) {
  if (type === 'create_todo' || type === 'create_plan') {
    return (
      <div className={s.saved} aria-hidden="true">
        <CheckIcon />
        <span className={s.savedLabel}>저장됨</span>
        <span className={s.undo}>되돌리기</span>
      </div>
    );
  }
  const remove = type === 'delete_todo' || type === 'delete_plan';
  return (
    <div className={s.buttons} aria-hidden="true">
      <span className={s.button}>거절</span>
      <span className={`${s.button} ${remove ? s.remove : s.accept}`}>{remove ? '삭제' : '수락'}</span>
    </div>
  );
}

function DiffRow({ field, before, after }: { field: string; before: string | null; after: string | null }) {
  return (
    <>
      <span className={s.field}>{field}</span>
      <span>
        {before !== null && after !== null && before !== after && (
          <>
            <span className={s.before}>{before}</span>
            <span className={s.arrow}>→</span>
          </>
        )}
        <span>{after ?? before}</span>
      </span>
    </>
  );
}

/** 질문 1~3개. 선택지는 2~4개이며 서명 토큰이라 값은 보이지 않는다. */
export function QuestionList({ questions }: { questions: Question[] }) {
  return (
    <>
      {questions.map((q, i) => (
        <div key={q.question_id} className={s.question}>
          <span className={s.qText}>
            {questions.length > 1 && <span className="mono">{i + 1}. </span>}
            {q.text}
          </span>
          <div className={s.options}>
            {q.options.map((o) => (
              <span key={o.option_id} className={s.option} title={o.item_id ? '항목 ' + o.item_id : undefined}>
                {o.text}
                {o.item_id && <span className={`mono ${s.optionItem}`}>@{shortId(o.item_id)}</span>}
              </span>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** D12 오늘 브리핑. 버튼 없이 보기만 하는 카드다. */
export function BriefingCard({ card }: { card: TodayBriefingCard }) {
  return (
    <div className={s.briefing}>
      <div className={s.bHead}>
        <Badge bg={KIND.briefing.bg} fg={KIND.briefing.color}>
          오늘 브리핑
        </Badge>
        <span className={`mono ${s.bTitle}`}>{card.date}</span>
        <span className={s.bCount}>
          계획 {card.plan_count} · 할 일 {card.todo_count}
        </span>
      </div>
      {card.plans.length > 0 && <span className={s.bSection}>계획</span>}
      {card.plans.map((p, i) => (
        <div key={p.id ?? i} className={s.bItem}>
          <span className={`mono ${s.bTime}`}>{p.time ?? '미정'}</span>
          <span>{p.title}</span>
        </div>
      ))}
      {card.todos.length > 0 && <span className={s.bSection}>미완료 할 일</span>}
      {card.todos.map((t, i) => (
        <div key={t.id ?? i} className={s.bItem}>
          <span className={`mono ${s.bTime}`}>{t.estimated_minutes == null ? '' : fmtMinutes(t.estimated_minutes)}</span>
          <span>{t.title}</span>
        </div>
      ))}
    </div>
  );
}
