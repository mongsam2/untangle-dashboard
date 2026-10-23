import { useEffect, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import { CloseIcon } from '../../components/icons';
import { PhoneChat } from './PhoneChat';
import s from './Replay.module.css';
import type { ReplayView } from './replayModel';

interface ReplayFrameProps {
  title: string;
  sub: string;
  badges?: ReactNode;
  view: ReplayView;
  stream: ReactNode;
  controls: ReactNode;
  onClose: () => void;
}

// 실행 재생과 대화 재생이 같이 쓰는 틀.
export function ReplayFrame({ title, sub, badges, view, stream, controls, onClose }: ReplayFrameProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className={s.scrim} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={s.player} onClick={(e) => e.stopPropagation()}>
        <div className={s.head}>
          <span className={s.headTitle}>{title}</span>
          <span className={`mono ${s.headSub}`}>{sub}</span>
          {badges}
          <div className={s.headRight}>
            <Button variant="icon" aria-label="재생 닫기" onClick={onClose}>
              <CloseIcon />
            </Button>
          </div>
        </div>
        <div className={s.body}>
          <div className={s.phoneWrap}>
            <PhoneChat chat={view.chat} typing={view.typing} />
          </div>
          {stream}
        </div>
        {controls}
      </div>
    </div>
  );
}
