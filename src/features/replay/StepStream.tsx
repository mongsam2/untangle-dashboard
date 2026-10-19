import { Badge } from '../../components/Badge';
import { StepIcon } from '../../components/StepIcon';
import a from './anim.module.css';
import type { ReplayCard } from './replayModel';
import s from './StepStream.module.css';
import { TypingDots } from './TypingDots';

// 오른쪽 단계 흐름. 지금 박자의 카드만 강조하고 지난 카드는 흐리게 둔다.
export function StepStream({ cards }: { cards: ReplayCard[] }) {
  return (
    <div className={s.scroll}>
      <div className={s.list}>
        {cards.map((c) => (
          <div key={c.key} className={a.in}>
            <div className={`card ${s.card} ${c.current ? s.current : s.past} ${c.kind === 'server' ? s.server : ''}`}>
              <div className={s.head}>
                <StepIcon kind={c.kind} />
                <span className={`${c.mono ? 'mono' : ''} ${s.title}`}>{c.title}</span>
                {c.badge && (
                  <Badge className={a.pop} bg={c.badge.bg} fg={c.badge.fg} dot={c.badge.dot}>
                    {c.badge.label}
                  </Badge>
                )}
                {c.anim && (
                  <span className={s.right}>
                    <TypingDots />
                  </span>
                )}
                {c.stamp && <span className={`mono ${a.pop} ${s.right} ${s.stamp}`}>{c.stamp}</span>}
              </div>
              {c.text !== undefined && <div className={`${c.anim ? a.reveal : ''} ${c.textSmall ? s.textSmall : s.text}`}>{c.text}</div>}
              {c.args !== undefined && <div className={`mono ${s.args}`}>{c.args}</div>}
              {c.bar && (
                <div className={s.track}>
                  <div className={a.bar} style={{ background: c.bar }} />
                </div>
              )}
              {c.error && (
                <div className={`${a.pop} ${s.error}`}>
                  <span className={`mono ${s.errorCode}`}>{c.error.code}</span> {c.error.message}
                </div>
              )}
              {c.next && <div className={`${a.pop} ${s.next}`}>{c.next}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
