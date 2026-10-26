import type { RunInput } from '../../api/types';
import { Badge } from '../../components/Badge';
import { StepIcon } from '../../components/StepIcon';
import { shortId } from '../../lib/format';
import { inputText, splitMentions } from '../../lib/input';
import s from './UserInput.module.css';

// 사용자 입력 카드. 멘션 칩은 `{{task:ID}}` 대신 짧은 ID 칩으로, 답변 묶음은 개수만 보여준다.
export function UserInput({ input }: { input: RunInput }) {
  const ctx = input.context;
  return (
    <div className={`card ${s.card}`}>
      <div className={s.head}>
        <StepIcon kind="user" size={28} />
        <span className={s.label}>{input.kind === 'answers' ? '질문 답변 묶음' : '사용자 입력'}</span>
      </div>
      {input.kind === 'answers' ? (
        <p className={`${s.text} ${s.answers}`}>{inputText(input)} · 답변 본문은 저장하지 않아요.</p>
      ) : (
        <p className={s.text}>
          {splitMentions(input.text ?? '').map((part, i) =>
            part.kind === 'mention' ? (
              <span key={i} className={s.mention} title={part.value}>
                @{shortId(part.value)}
              </span>
            ) : (
              <span key={i}>{part.value}</span>
            ),
          )}
        </p>
      )}
      <div className={s.context}>
        <span>
          요청 시각 <span className="mono">{ctx.requested_at}</span>
        </span>
        <span>
          시간대 <span className="mono">{ctx.time_zone}</span>
        </span>
        {ctx.selected_targets.length > 0 && (
          <span className={s.targets}>
            선택 항목
            {ctx.selected_targets.map((t) => (
              <Badge key={t.id} mono ring title={t.id}>
                {t.category === 'todo' ? '할 일' : '계획'} {shortId(t.id)}
              </Badge>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
