import { Button } from '../../components/Button';
import { PlayIcon } from '../../components/icons';
import { fmtCost, fmtInt, fmtSec } from '../../lib/format';
import { FAILURE_COLOR, GUARD_COLOR, KIND, MODEL_COLOR, SERVER_COLOR } from '../../lib/kinds';
import type { ReplayView, Speed } from './replayModel';
import { SPEEDS } from './replayModel';
import s from './Replay.module.css';

interface ReplayControlsProps {
  view: ReplayView;
  total: number;
  playing: boolean;
  speed: Speed;
  onToggle: () => void;
  onSeek: (t: number) => void;
  onSpeed: (v: Speed) => void;
}

const PAUSE = 'M6 5h4v14H6zM14 5h4v14h-4z';
const REPLAY = 'M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z';

function markerColor(m: ReplayView['markers'][number]): string {
  if (m.kind === 'final') return 'var(--data-success)';
  const st = m.step!;
  if (st.kind === 'model') return MODEL_COLOR;
  if (st.kind === 'tool') return st.status === 'failed' ? FAILURE_COLOR : KIND[st.tool_kind ?? 'query'].color;
  if (st.kind === 'guardrail') return st.passed === false ? FAILURE_COLOR : GUARD_COLOR;
  return SERVER_COLOR;
}

// 재생 조작 줄. 진행 막대 위에 단계 시작 지점을 종류 색 점으로 찍는다. 가드레일은 세로 막대.
export function ReplayControls({ view, total, playing, speed, onToggle, onSeek, onSpeed }: ReplayControlsProps) {
  const pct = total > 0 ? (view.pos / total) * 100 : 100;
  const icon = view.ended && !playing ? REPLAY : playing ? PAUSE : undefined;
  return (
    <div className={s.controls}>
      <Button variant="iconPrimary" aria-label={playing ? '일시정지' : view.ended ? '처음부터' : '재생'} onClick={onToggle}>
        {icon ? <PlayIcon size={18} path={icon} /> : <PlayIcon size={18} />}
      </Button>
      <div className={s.track}>
        <span className={s.trackBar} />
        <span className={s.trackFill} style={{ width: pct + '%' }} />
        {view.markers.map((m, i) => (
          <span
            key={i}
            className={`${s.marker} ${m.step?.kind === 'guardrail' ? s.markerGuard : ''}`}
            style={{ left: (total > 0 ? (m.t / total) * 100 : 0) + '%', background: markerColor(m) }}
            title={m.kind === 'final' ? '최종 응답' : m.step!.kind === 'tool' ? (m.step!.tool_name ?? '도구') : m.step!.kind === 'guardrail' ? (m.step!.guardrail_name ?? '가드레일') : m.step!.kind}
          />
        ))}
        <input className={s.range} type="range" min={0} max={Math.max(total, 1)} step={1} value={view.pos} aria-label="재생 위치" onChange={(e) => onSeek(Number(e.target.value))} />
      </div>
      <div className={s.headRight}>
        <span className={`mono ${s.time}`}>
          {fmtSec(view.pos)} / {fmtSec(total)}
        </span>
        <span className={s.speeds} role="group" aria-label="재생 속도">
          {SPEEDS.map((v) => (
            <Button key={v} variant="chip" aria-pressed={v === speed} onClick={() => onSpeed(v)} style={{ minHeight: 28, padding: '0 8px', fontSize: 12 }}>
              {v}×
            </Button>
          ))}
        </span>
        <span className={s.totals}>
          <span>
            입력 <b className="mono">{fmtInt(view.cumIn)}</b>
          </span>
          <span>
            출력 <b className="mono">{fmtInt(view.cumOut)}</b>
          </span>
          <span>
            비용 <b className="mono">{fmtCost(view.cumCost)}</b>
          </span>
        </span>
      </div>
    </div>
  );
}
