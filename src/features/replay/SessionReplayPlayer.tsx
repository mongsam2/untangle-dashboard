import { useMemo } from 'react';
import { useSession } from '../../api/queries';
import type { SessionDetailResponse } from '../../api/types';
import { Badge } from '../../components/Badge';
import { shortId } from '../../lib/format';
import { ReplayControls } from './ReplayControls';
import { ReplayFrame } from './ReplayFrame';
import s from './Replay.module.css';
import { buildSessionTimeline, sessionViewAt } from './sessionReplay';
import { StepStream } from './StepStream';
import { useReplay } from './useReplay';

// 대화의 턴을 이어서 재생한다. 앞 턴의 채팅·단계·누적 수치는 지우지 않는다.
export function SessionReplayPlayer({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const q = useSession(sessionId);
  if (!q.data) {
    return (
      <div className={s.scrim} onClick={onClose}>
        <div className={s.player} style={{ height: 'auto', padding: 24 }}>
          {q.isError ? '대화를 불러오지 못했어요. ' + q.error.message : '불러오는 중…'}
        </div>
      </div>
    );
  }
  return <Player detail={q.data} onClose={onClose} />;
}

function Player({ detail, onClose }: { detail: SessionDetailResponse; onClose: () => void }) {
  const timeline = useMemo(() => buildSessionTimeline(detail), [detail]);
  // 대화는 턴이 이어져 2배속이면 말풍선을 읽기 전에 지나가므로 1배속으로 시작한다.
  const replay = useReplay(timeline.total, 1);
  const view = useMemo(() => sessionViewAt(detail, timeline, replay.pos), [detail, timeline, replay.pos]);
  const groups = view.turnSteps.map((t) => ({ key: String(t.turnIndex), label: `턴 ${t.turnIndex} · ${shortId(detail.turns[t.turnIndex - 1]!.run.turn_id)}`, steps: t.steps }));
  return (
    <ReplayFrame
      title="대화 재생"
      sub={'session ' + shortId(detail.session.session_id)}
      badges={
        <Badge ring>
          턴 {view.turnIndex} / {view.turnCount}
        </Badge>
      }
      view={view}
      stream={<StepStream groups={groups} empty="재생을 시작하면 턴마다 단계가 여기에 쌓여요." />}
      controls={<ReplayControls view={view} total={timeline.total} playing={replay.playing} speed={replay.speed} onToggle={replay.toggle} onSeek={replay.seek} onSpeed={replay.setSpeed} />}
      onClose={onClose}
    />
  );
}
