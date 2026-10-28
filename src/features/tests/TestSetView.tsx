import { useState } from 'react';
import { Button } from '../../components/Button';
import { ChevronRight, FilterIcon } from '../../components/icons';
import { Segmented } from '../../components/Segmented';
import { Panel, RateCell, Tag } from './parts';
import {
  bestPassRate,
  CATEGORIES,
  categoryOf,
  COVERAGE_COLUMNS,
  coverage,
  casePassRate,
  featureShort,
  fmtRate,
  rateLevel,
  restSummary,
  runLabel,
  valueOf,
  type TestRun,
  type TestSet,
} from './testModel';
import s from './Tests.module.css';

const PAGE = 10;
const LABEL_W = 96;

export function TestSetView({ set, lastRun, onOpenCase }: { set: TestSet; lastRun: TestRun | null; onOpenCase: (id: string) => void }) {
  const { cases } = set;
  const groups = coverage(cases);
  const checks = cases.flatMap((c) => c.checks);
  const features = new Set(cases.flatMap((c) => c.features));
  const exampleFeatures = new Set(set.qualityExamples.map((q) => q.feature));
  const levels = new Set(set.qualityExamples.map((q) => q.level));
  const best = lastRun ? bestPassRate(lastRun) : null;
  const tiles = [
    { label: '케이스', value: String(cases.length), sub: `기능 ${features.size}종 · 카테고리 ${CATEGORIES.length}개` },
    { label: '체크 항목', value: String(checks.length), sub: `코드 ${checks.filter((c) => c.judge === 'code').length} · 채점 ${checks.filter((c) => c.judge === 'grader').length}` },
    { label: '품질 예시', value: String(set.qualityExamples.length), sub: `기능 ${exampleFeatures.size}종 × ${levels.size}단계` },
    { label: '최근 실행 통과율', value: fmtRate(best), sub: lastRun ? `${runLabel(lastRun).replace(/ 실행$/, '')} · 설정 ${lastRun.configs.length}개 중 최고` : '–' },
  ];

  return (
    <>
      <section className={s.kpis} aria-label="요약 수치">
        {tiles.map((t) => (
          <div key={t.label} className={`card ${s.kpi}`}>
            <span className={s.kpiLabel}>{t.label}</span>
            <span className={s.kpiValue}>{t.value}</span>
            <span className={s.kpiSub}>{t.sub}</span>
          </div>
        ))}
      </section>
      <Panel title="카테고리별 케이스 수">
        <div className={s.coverage}>
          {COVERAGE_COLUMNS.map((keys) => (
            <div key={keys.join()} className={s.coverageColumn}>
              {keys.map((key) => {
                const g = groups.find((x) => x.key === key)!;
                return (
                  <div key={key} className={s.group}>
                    <h3 className={s.groupTitle}>{g.title}</h3>
                    {g.rows.map((r) => (
                      <div key={r.id} className={s.coverageRow}>
                        <span className={s.coverageLabel}>{r.label}</span>
                        <span className={s.coverageBar}>
                          <span style={{ width: `${r.ratio * 100}%` }} />
                        </span>
                        <span className={`mono ${s.coverageCount}`}>{r.count}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Panel>
      <CaseTable set={set} lastRun={lastRun} onOpenCase={onOpenCase} />
    </>
  );
}

function CaseTable({ set, lastRun, onOpenCase }: { set: TestSet; lastRun: TestRun | null; onOpenCase: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState('all');
  const [feature, setFeature] = useState('all');
  const [shown, setShown] = useState(PAGE);
  const rows = [...set.cases]
    .filter((c) => (info === 'all' || c.info === info) && (feature === 'all' || c.features.includes(feature)))
    .sort((a, b) => a.id.localeCompare(b.id));
  const active = (info === 'all' ? 0 : 1) + (feature === 'all' ? 0 : 1);
  const pick = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setShown(PAGE);
  };

  return (
    <Panel title={`케이스 ${rows.length}개`}>
      <div className={s.filterRow}>
        <Button variant="outline" filled={open || active > 0} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <FilterIcon />
          필터
        </Button>
        <Tag tone="info">{categoryOf('info').title}: {info === 'all' ? '전체' : valueOf('info', info)?.label}</Tag>
        <Tag tone="info">{categoryOf('feature').title}: {feature === 'all' ? '전체' : valueOf('feature', feature)?.label}</Tag>
      </div>
      {open && (
        <div className={s.filterPanel}>
          <Segmented
            label={categoryOf('info').title}
            labelWidth={LABEL_W}
            value={info}
            onChange={pick(setInfo)}
            options={[{ value: 'all', label: '전체' }, ...categoryOf('info').values.map((x) => ({ value: x.id, label: x.label, count: set.cases.filter((c) => c.info === x.id).length }))]}
          />
          <Segmented
            label={categoryOf('feature').title}
            labelWidth={LABEL_W}
            value={feature}
            onChange={pick(setFeature)}
            options={[{ value: 'all', label: '전체' }, ...categoryOf('feature').values.map((x) => ({ value: x.id, label: x.label, count: set.cases.filter((c) => c.features.includes(x.id)).length }))]}
          />
        </div>
      )}
      <div className={s.scroll}>
        <div className={`${s.table} ${s.caseTable}`}>
          <div className={`${s.row} ${s.headRow} ${s.caseCols}`}>
            <span>ID</span>
            <span>마지막 요청</span>
            <span>기능</span>
            <span>나머지 카테고리</span>
            <span className={s.right}>체크</span>
            <span className={s.center}>최근 통과율</span>
            <span />
          </div>
          {rows.slice(0, shown).map((c) => {
            const rate = casePassRate(lastRun, c.id);
            return (
              <button key={c.id} type="button" className={`${s.row} ${s.bodyRow} ${s.caseCols} ${s.rowButton}`} onClick={() => onOpenCase(c.id)}>
                <span className={`mono ${s.id}`}>{c.id}</span>
                <span className={s.ellipsis}>{c.message}</span>
                <span className={s.clip}>
                  <Tag tone="neutral">{featureShort(c)}</Tag>
                </span>
                <span className={`${s.ellipsis} ${s.secondary}`}>{restSummary(c)}</span>
                <span className={`mono ${s.right}`}>{c.checks.length}</span>
                <RateCell level={rateLevel(rate)}>{fmtRate(rate)}</RateCell>
                <ChevronRight />
              </button>
            );
          })}
        </div>
      </div>
      {rows.length > shown && (
        <div className={s.more}>
          <Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>
            더 보기
          </Button>
        </div>
      )}
    </Panel>
  );
}
