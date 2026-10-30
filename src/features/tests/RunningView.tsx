import { fmtTime } from '../../lib/format';
import { ConfigChip, Panel, ProgressBar, RateCell, Tag } from './parts';
import { configProgress, fmtMinutes, fmtQuality, fmtRate, fmtSeconds, fmtUsd, rateLevel, runProgress, type TestCase, type TestRun } from './testModel';
import s from './Tests.module.css';

const RECENT = 5;

// 진행 중인 실행: 전체·설정별 진행과 방금 끝난 시도.
export function RunningView({ run, cases }: { run: TestRun; cases: TestCase[] }) {
  const p = runProgress(run);
  const perConfig = configProgress(run);
  const byId = new Map(cases.map((c) => [c.id, c]));
  const recent = run.attempts.slice(-RECENT).reverse();
  const time = [
    `${Math.floor(p.elapsedMs / 60000)}분 지남`,
    p.remainingMs === null ? null : `약 ${fmtMinutes(p.remainingMs)} 남음`,
    `지금까지 ${fmtUsd(p.costUsd, 2)}`,
    `채점 ${fmtUsd(p.graderCostUsd, 2)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <Panel title="진행 상황">
        <div className={s.overall}>
          <span className={s.overallCount}>
            {p.done} / {p.total}
          </span>
          <span className={s.overallPct}>{Math.round(p.ratio * 100)}%</span>
          <span className={s.spacer} />
          <span className={s.secondary}>{time}</span>
        </div>
        <ProgressBar ratio={p.ratio} />
        <div className={s.scroll}>
          <div className={`${s.table} ${s.progressTable}`}>
            <div className={`${s.row} ${s.headRow} ${s.progressCols}`}>
              <span>설정</span>
              <span>진행</span>
              <span className={s.right}>완료</span>
              <span className={s.center}>지금까지 통과율</span>
              <span className={s.right}>평균 응답</span>
              <span className={s.right}>비용</span>
            </div>
            {run.configs.map((config, i) => {
              const c = perConfig[i]!;
              return (
                <div key={i} className={`${s.row} ${s.bodyRow} ${s.progressCols}`}>
                  <span>
                    <ConfigChip index={i} config={config} />
                  </span>
                  <ProgressBar ratio={c.total ? c.done / c.total : 0} tone={i} />
                  <span className={`mono ${s.right}`}>
                    {c.done} / {c.total}
                  </span>
                  <span className={s.center}>
                    <RateCell level={rateLevel(c.passRate)}>{fmtRate(c.passRate)}</RateCell>
                  </span>
                  <span className={`mono ${s.right}`}>{fmtSeconds(c.avgLatencyMs)}</span>
                  <span className={`mono ${s.right}`}>{fmtUsd(c.costUsd, 2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>
      <Panel title="방금 끝난 시도">
        <div className={s.scroll}>
          <div className={`${s.table} ${s.recentTable}`}>
            <div className={`${s.row} ${s.headRow} ${s.recentCols}`}>
              <span>시각</span>
              <span>케이스</span>
              <span>설정</span>
              <span className={s.center}>결과</span>
              <span className={s.right}>품질</span>
              <span className={s.right}>응답 시간</span>
              <span className={s.right}>비용</span>
            </div>
            {recent.length ? (
              recent.map((a) => (
                <div key={`${a.caseId}-${a.config}-${a.repeat}`} className={`${s.row} ${s.bodyRow} ${s.recentCols}`}>
                  <span className={`mono ${s.id}`}>{fmtTime(a.finishedAt)}</span>
                  <span className={s.ellipsis}>
                    {a.caseId} · {byId.get(a.caseId)?.message ?? ''}
                  </span>
                  <span>
                    <ConfigChip index={a.config} config={run.configs[a.config]!} />
                  </span>
                  <span className={s.center}>
                    <Tag tone={a.passed ? 'success' : 'danger'}>{a.passed ? '통과' : '실패'}</Tag>
                  </span>
                  <span className={`mono ${s.right}`}>{fmtQuality(a.quality, 0)}</span>
                  <span className={`mono ${s.right}`}>{fmtSeconds(a.latencyMs)}</span>
                  <span className={`mono ${s.right}`}>{fmtUsd(a.costUsd)}</span>
                </div>
              ))
            ) : (
              <div className={`${s.row} ${s.bodyRow} ${s.emptyRow}`}>아직 끝난 시도가 없어요.</div>
            )}
          </div>
        </div>
      </Panel>
    </>
  );
}
