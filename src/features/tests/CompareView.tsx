import { ConfigChip, Panel, RateCell } from './parts';
import {
  bestIndex,
  casesInRun,
  categoryRates,
  configSummaries,
  fmtQuality,
  fmtRate,
  fmtSeconds,
  fmtUsd,
  frequentFailures,
  JUDGE_LABEL,
  rateLevel,
  type CategoryKey,
  type ConfigSummary,
  type SummaryColumn,
  type TestCase,
  type TestRun,
} from './testModel';
import s from './Tests.module.css';

const SUMMARY_COLUMNS: { key: SummaryColumn; label: string; fmt: (x: ConfigSummary) => string }[] = [
  { key: 'passRate', label: '통과율', fmt: (x) => fmtRate(x.passRate) },
  { key: 'quality', label: '품질 점수 (1~3)', fmt: (x) => fmtQuality(x.quality) },
  { key: 'avgLatencyMs', label: '평균 응답', fmt: (x) => fmtSeconds(x.avgLatencyMs) },
  { key: 'p90LatencyMs', label: '느린 10%', fmt: (x) => fmtSeconds(x.p90LatencyMs) },
  { key: 'costPerAttempt', label: '요청당 비용', fmt: (x) => fmtUsd(x.costPerAttempt) },
  { key: 'costUsd', label: '설정 비용', fmt: (x) => fmtUsd(x.costUsd, 2) },
];

const LEGEND = [
  { level: 'good', sample: '92%', text: '85% 이상' },
  { level: 'mid', sample: '78%', text: '70~84%' },
  { level: 'bad', sample: '52%', text: '70% 미만' },
] as const;

// 끝난(또는 중단된) 실행의 결과 비교: 설정별 요약, 카테고리 값별 통과율, 자주 틀린 체크 항목.
// 카테고리 값 줄을 누르면 그 값의 케이스 결과로 들어간다.
export function CompareView({ run, cases, onOpenValue }: { run: TestRun; cases: TestCase[]; onOpenValue: (key: CategoryKey, value: string, caseId: string) => void }) {
  const summaries = configSummaries(run);
  const groups = categoryRates(run, cases);
  const failures = frequentFailures(run, cases);
  const cols = { gridTemplateColumns: `minmax(160px, 1fr) 72px ${run.configs.map(() => '150px').join(' ')}` };
  const failCols = { gridTemplateColumns: `minmax(240px, 1fr) 80px ${run.configs.map(() => '150px').join(' ')}` };

  return (
    <>
      <Panel title="설정별 요약">
        <div className={s.scroll}>
          <div className={s.table} style={{ minWidth: 980 }}>
            <div className={`${s.row} ${s.headRow} ${s.summaryCols}`}>
              <span>설정</span>
              {SUMMARY_COLUMNS.map((c) => (
                <span key={c.key} className={s.right}>
                  {c.label}
                </span>
              ))}
            </div>
            {run.configs.map((config, i) => (
              <div key={i} className={`${s.row} ${s.bodyRow} ${s.summaryCols}`}>
                <span>
                  <ConfigChip index={i} config={config} />
                </span>
                {SUMMARY_COLUMNS.map((c) => (
                  <span key={c.key} className={`mono ${s.right} ${bestIndex(summaries, c.key) === i ? s.best : ''}`}>
                    {c.fmt(summaries[i]!)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Panel>
      <Panel title="카테고리별 통과율">
        <div className={s.legend}>
          {LEGEND.map((l) => (
            <span key={l.level} className={s.legendItem}>
              <RateCell level={l.level} size="xs">
                {l.sample}
              </RateCell>
              {l.text}
            </span>
          ))}
        </div>
        <div className={s.scroll}>
          <div className={s.matrix} style={{ minWidth: 640 }}>
            <div className={`${s.row} ${s.headRow}`} style={cols}>
              <span>카테고리 값</span>
              <span className={s.right}>케이스</span>
              {run.configs.map((config, i) => (
                <span key={i} className={s.center}>
                  <ConfigChip index={i} config={config} />
                </span>
              ))}
            </div>
            {groups.map((g) => (
              <div key={g.key} className={s.categoryBox}>
                <h3 className={s.categoryTitle}>{g.title}</h3>
                {g.rows.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`${s.row} ${s.categoryRow} ${s.rowButton}`}
                    style={cols}
                    onClick={() => {
                      const first = casesInRun(run, cases, { key: g.key, value: r.id })[0];
                      if (first) onOpenValue(g.key, r.id, first.id);
                    }}
                  >
                    <span>{r.label}</span>
                    <span className={`mono ${s.right}`}>{r.count}</span>
                    {r.rates.map((rate, i) => (
                      <span key={i} className={s.center}>
                        <RateCell level={rateLevel(rate)}>{fmtRate(rate)}</RateCell>
                      </span>
                    ))}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Panel>
      <Panel title="자주 틀린 체크 항목">
        <div className={s.scroll}>
          <div className={s.table} style={{ minWidth: 640 }}>
            <div className={`${s.row} ${s.headRow}`} style={failCols}>
              <span>체크 항목</span>
              <span>판정</span>
              {run.configs.map((config, i) => (
                <span key={i} className={s.center}>
                  <ConfigChip index={i} config={config} />
                </span>
              ))}
            </div>
            {failures.length ? (
              failures.map((f) => (
                <div key={f.text} className={`${s.row} ${s.bodyRow}`} style={failCols}>
                  <span className={s.ellipsis}>{f.text}</span>
                  <span className={`mono ${s.id}`}>{JUDGE_LABEL[f.judge]}</span>
                  {f.counts.map((n, i) => (
                    <span key={i} className={`mono ${s.center} ${n ? s.danger : s.secondary}`}>
                      {n}건
                    </span>
                  ))}
                </div>
              ))
            ) : (
              <div className={`${s.row} ${s.bodyRow} ${s.emptyRow}`}>틀린 체크 항목이 없어요.</div>
            )}
          </div>
        </div>
      </Panel>
    </>
  );
}
