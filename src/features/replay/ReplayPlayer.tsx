import { useEffect, useMemo, type ReactNode } from 'react';
import { useRun } from '../../api/queries';
import type { RunDetailResponse } from '../../api/types';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { CloseIcon } from '../../components/icons';
import { inputText } from '../../lib/input';
import { summaryOf } from '../runs/summary';
import { PhoneChat } from './PhoneChat';
import { ReplayControls } from './ReplayControls';
import { buildView, finalTextOf, runTimeline, scriptOf } from './replayModel';
import s from './ReplayPlayer.module.css';
import { StepStream } from './StepStream';
import { useReplay } from './useReplay';

interface ReplayPlayerProps {
  runId: string;
  onClose: () => void;
}

// 요청 하나를 이전 대화 → 사용자 입력 → 단계 → 최종 응답 순서로 다시 보여주는 전체 화면.
export function ReplayPlayer({ runId, onClose }: ReplayPlayerProps) {
  const q = useRun(runId);
  return (
    <ReplayDialog label="실행 재생" onClose={onClose}>
      {q.data ? (
        <Player key={runId} detail={q.data} onClose={onClose} />
      ) : (
        <ReplayLoading failed={q.isError} onClose={onClose} />
      )}
    </ReplayDialog>
  );
}

/** 재생 전체 화면 틀. Esc로 닫고 뒤 화면의 스크롤을 막는다. */
export function ReplayDialog({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={label} className={s.dialog}>
      {children}
    </div>
  );
}

export function ReplayLoading({ failed, onClose }: { failed: boolean; onClose: () => void }) {
  return (
    <>
      <TopBar caseLabel="" title={failed ? '불러오지 못했어요' : '불러오는 중…'} onClose={onClose} />
      <div className={s.body} />
    </>
  );
}

export function TopBar({ caseLabel, title, onClose }: { caseLabel: string; title: string; onClose: () => void }) {
  return (
    <div className={s.top}>
      {caseLabel && (
        <Badge mono bg="var(--color-ink)" fg="var(--color-canvas)">
          {caseLabel}
        </Badge>
      )}
      <span className={s.title}>{title}</span>
      <Button variant="icon" className={s.close} aria-label="재생 닫기" onClick={onClose}>
        <CloseIcon />
      </Button>
    </div>
  );
}

function Player({ detail, onClose }: { detail: RunDetailResponse; onClose: () => void }) {
  const script = useMemo(() => scriptOf(detail), [detail]);
  const timeline = useMemo(() => runTimeline(script), [script]);
  const rp = useReplay(timeline);
  const view = buildView(detail, script, rp.state);
  const final = finalTextOf(detail);
  return (
    <>
      <TopBar caseLabel={detail.run.test_case_id ?? '실제 요청'} title={summaryOf(detail.run)} onClose={onClose} />
      <div className={s.body}>
        <PhoneChat view={view} userText={inputText(detail.input)} finalText={final.text} options={final.options} />
        <StepStream cards={view.cards} />
      </div>
      <ReplayControls view={view} playing={rp.state.playing} onToggle={rp.toggle} onPrev={rp.prev} onNext={rp.next} onSeek={rp.seek} />
    </>
  );
}
