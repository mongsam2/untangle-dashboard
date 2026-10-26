import { useEffect, useRef } from 'react';
import { splitMentions } from '../../lib/input';
import { shortId } from '../../lib/format';
import { BriefingCard, ProposalCard, QuestionList } from '../run-detail/reply/ProposalCard';
import s from './Replay.module.css';
import type { ChatLine } from './replayModel';

// 앱의 채팅 화면을 흉내 낸 폰 프레임. 새 줄이 생기면 아래로 따라 내려간다.
export function PhoneChat({ chat, typing }: { chat: ChatLine[]; typing: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length, typing]);
  return (
    <div className={s.phone} aria-label="앱 채팅 미리보기">
      <div className={s.phoneBar}>탱글</div>
      <div ref={ref} className={s.chat}>
        {chat.map((line) => (
          <ChatLineView key={line.id} line={line} />
        ))}
        {typing && (
          <div className={s.typing}>
            <span className={s.dots} aria-label="정리하는 중">
              <span />
              <span />
              <span />
            </span>
            <span className={s.typingLabel}>정리하는 중…</span>
          </div>
        )}
      </div>
      <div className={s.inputBar} aria-hidden="true">
        <span className={s.inputField} />
        <span className={s.inputSend} />
      </div>
    </div>
  );
}

function ChatLineView({ line }: { line: ChatLine }) {
  switch (line.kind) {
    case 'user':
      return (
        <div className={`${s.line} ${s.lineUser}`}>
          <p className={`${s.bubble} ${s.bubbleUser}`}>
            {splitMentions(line.text).map((part, i) => (part.kind === 'mention' ? <span key={i}>@{shortId(part.value)}</span> : <span key={i}>{part.value}</span>))}
          </p>
        </div>
      );
    case 'agent':
      return (
        <div className={s.line}>
          <span className={s.who}>
            탱글
            {line.fallback && (
              <span className={s.fallback} title="모델이 말풍선을 비워서 서버가 기본 문장으로 채웠어요.">
                서버 기본 문구
              </span>
            )}
          </span>
          <p className={`${s.bubble} ${s.bubbleAgent}`}>{line.text}</p>
        </div>
      );
    case 'proposal':
      return (
        <div className={`${s.line} ${s.cardLine}`}>
          <ProposalCard proposal={line.proposal} compact />
        </div>
      );
    case 'question':
      return (
        <div className={`${s.line} ${s.cardLine}`}>
          <QuestionList questions={line.questions} />
        </div>
      );
    case 'briefing':
      return (
        <div className={`${s.line} ${s.cardLine}`}>
          <BriefingCard card={line.card} />
        </div>
      );
    case 'error':
      return (
        <div className={s.line}>
          <p className={`${s.bubble} ${s.bubbleError}`}>
            <span className="mono">{line.code}</span> · {line.text}
          </p>
        </div>
      );
    case 'system':
      return (
        <div className={s.line}>
          <span className={s.bubbleSystem}>{line.text}</span>
        </div>
      );
  }
}
