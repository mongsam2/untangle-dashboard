import { Button } from '../../components/Button';
import { PlayIcon } from '../../components/icons';
import { fmtCost, fmtInt } from '../../lib/format';
import type { ReplayView } from './replayModel';
import s from './ReplayControls.module.css';

interface ReplayControlsProps {
  view: ReplayView;
  playing: boolean;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (i: number) => void;
}

export function ReplayControls({ view, playing, onToggle, onPrev, onNext, onSeek }: ReplayControlsProps) {
  const label = playing ? '일시정지' : view.ended ? '처음부터 다시 재생' : '재생';
  return (
    <div className={s.bar}>
      <div className={s.buttons}>
        <Button variant="icon" aria-label="이전 단계" onClick={onPrev}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 5h2v14H6z" />
            <path d="M19 5v14L9 12z" />
          </svg>
        </Button>
        <Button variant="iconPrimary" aria-label={label} onClick={onToggle}>
          {playing ? (
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 5h4v14H7z" />
              <path d="M13 5h4v14h-4z" />
            </svg>
          ) : view.ended ? (
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12a8 8 0 1 0 2.4-5.7" />
              <path d="M4 4v4h4" />
            </svg>
          ) : (
            <PlayIcon size={20} path="M8 5v14l11-7z" />
          )}
        </Button>
        <Button variant="icon" aria-label="다음 단계" onClick={onNext}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 5h2v14h-2z" />
            <path d="M5 5v14l10-7z" />
          </svg>
        </Button>
      </div>
      <div className={s.markers}>
        {view.markers.map((m, i) => (
          <button key={i} type="button" className={s.marker} title={m.title} aria-label={m.title} aria-current={m.current ? 'step' : undefined} onClick={() => onSeek(i)}>
            <span className={s.markerBar} style={{ height: m.current ? 10 : 6, background: m.color, opacity: m.past ? 1 : 0.22 }} />
          </button>
        ))}
      </div>
      <span className={`mono ${s.pos}`}>{view.pos}</span>
      <span className={s.cum}>
        <span>
          입력 <span className="mono">{fmtInt(view.cumIn)}</span>
        </span>
        <span>
          출력 <span className="mono">{fmtInt(view.cumOut)}</span>
        </span>
        <span>
          비용 <span className="mono">{fmtCost(view.cumCost)}</span>
        </span>
      </span>
    </div>
  );
}
