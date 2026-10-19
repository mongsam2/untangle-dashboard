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
export function PhoneChat({ view, userText, finalText, options }: PhoneChatProps) {
  return (
    <div className={s.phone}>
      <div className={s.head}>탱글</div>
      <div className={s.scroll}>
        <div className={s.thread}>
          {view.history.map((h, i) => (
            <div key={i} className={`${a.in} ${s.bubble} ${h.role === 'user' ? s.user : s.agent}`}>
              {h.text}
            </div>
          ))}
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
