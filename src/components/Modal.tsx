import { useEffect, type ReactNode } from 'react';
import { Button } from './Button';
import { CloseIcon } from './icons';
import s from './Modal.module.css';

interface ModalProps {
  overline?: string;
  title: string;
  icon?: ReactNode;
  tags?: ReactNode;
  side?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

// 구조 탭의 모듈 설명 창. 스크림 + 960폭, 본문은 Main과 336 고정폭 Side로 나뉜다.
export function Modal({ overline, title, icon, tags, side, footer, onClose, children }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className={s.scrim} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={s.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={s.head}>
          {icon}
          <div className={s.headText}>
            {overline && <span className={s.overline}>{overline}</span>}
            <h2 className={s.title}>{title}</h2>
            {tags}
          </div>
          <Button variant="icon" aria-label="닫기" onClick={onClose}>
            <CloseIcon />
          </Button>
        </div>
        <div className={`${s.body} ${side ? '' : s.bodySingle}`}>
          <div>{children}</div>
          {side && <aside className={s.side}>{side}</aside>}
        </div>
        {footer && <div className={s.foot}>{footer}</div>}
      </div>
    </div>
  );
}
