import { Fragment } from 'react';
import { buttonLabelOf, parseHistoryLine } from '../../lib/history';
import a from './anim.module.css';
import s from './PhoneChat.module.css';
import type { ReplayView } from './replayModel';
import { TypingDots } from './TypingDots';

interface PhoneChatProps {
  view: ReplayView;
  userText: string;
  finalText: string;
  options: string[];
}

// 앱 화면처럼 보이는 대화창. 아래부터 쌓인다.
// 이전 대화의 `[YYYY-MM-DD] ` 접두사와 `[제안 수락: 제목]` 표기는 서버가 모델에 주려고 붙인 것이라
// 앱 화면에서는 날짜 구분선과 버튼을 누른 말풍선으로 풀어서 보여준다.
export function PhoneChat({ view, userText, finalText, options }: PhoneChatProps) {
  let shownDay: string | null = null;
  return (
    <div className={s.phone}>
      <div className={s.head}>탱글</div>
      <div className={s.scroll}>
        <div className={s.thread}>
          {view.history.map((h, i) => {
            const line = parseHistoryLine(h);
            const newDay = line.day && line.day !== shownDay ? line.day : null;
            if (newDay) shownDay = newDay;
            return (
              <Fragment key={i}>
                {newDay && <div className={`${a.in} ${s.day}`}>{newDay}</div>}
                <div className={`${a.in} ${s.bubble} ${h.role === 'user' ? s.user : s.agent} ${line.kind === 'message' ? '' : s.button}`}>
                  {line.kind === 'message' ? line.text : buttonLabelOf(line)}
                </div>
              </Fragment>
            );
          })}
          {view.userShown && <div className={`${a.in} ${s.bubble} ${s.user}`}>{userText}</div>}
          {view.typing && (
            <div className={`${a.in} ${s.typing}`} aria-label="탱글이 응답을 준비하는 중">
              <TypingDots />
            </div>
          )}
          {view.finalShown && (
            <>
              <div className={`${a.in} ${s.bubble} ${s.agent} ${s.final}`}>{finalText}</div>
              {options.length > 0 && (
                <div className={`${a.in} ${s.options}`}>
                  {options.map((o) => (
                    <span key={o} className={s.option}>
                      {o}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
