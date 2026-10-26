import { useMemo } from 'react';
import { useRun } from '../../api/queries';
import type { RunDetailResponse } from '../../api/types';
import { Badge } from '../../components/Badge';
import { shortId } from '../../lib/format';
import { RUN_STATUS } from '../../lib/status';
import { ReplayControls } from './ReplayControls';
import { ReplayFrame } from './ReplayFrame';
import s from './Replay.module.css';
import { buildTimeline, viewAt } from './replayModel';
import { StepStream } from './StepStream';
import { useReplay } from './useReplay';

// 실행 하나를 시간 순서대로 다시 보여준다. 폰 화면에는 사용자 입력 → ··· → 최종 응답, 오른쪽에는 단계 카드가 쌓인다.
export function ReplayPlayer({ runId, onClose }: { runId: string; onClose: () => void }) {
  const q = useRun(runId);
  if (!q.data) {
    return (
      <div className={s.scrim} onClick={onClose}>
        <div className={s.player} style={{ height: 'auto', padding: 24 }}>
          {q.isError ? '요청을 불러오지 못했어요. ' + q.error.message : '불러오는 중…'}
        </div>
      </div>
    );
  }
  return <Player detail={q.data} onClose={onClose} />;
}

function Player({ detail, onClose }: { detail: RunDetailResponse; onClose: () => void }) {
  const timeline = useMemo(() => buildTimeline(detail), [detail]);
  const replay = useReplay(timeline.total);
  const view = useMemo(() => viewAt(detail, timeline, replay.pos), [detail, timeline, replay.pos]);
  const st = RUN_STATUS[detail.run.status];
  return (
    <ReplayFrame
      title="요청 재생"
      sub={'turn ' + shortId(detail.run.turn_id)}
      badges={
        <Badge bg={st.bg} fg={st.fg} dot={st.dot}>
          {st.label}
        </Badge>
      }
      view={view}
      stream={<StepStream groups={[{ key: detail.run.turn_id, steps: view.steps }]} empty="재생을 시작하면 단계가 여기에 쌓여요." />}
      controls={<ReplayControls view={view} total={timeline.total} playing={replay.playing} speed={replay.speed} onToggle={replay.toggle} onSeek={replay.seek} onSpeed={replay.setSpeed} />}
      onClose={onClose}
    />
  );
}
