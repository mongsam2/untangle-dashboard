import { useState } from 'react';
import { useViewState } from '../../app/useViewState';
import { Button } from '../../components/Button';
import { ArrowRightIcon } from '../../components/icons';
import { Notice } from '../../components/Page';
import { CheckRow, ConfigChip, Dropdown, Meta, RateCell, Tag, type TagTone } from './parts';
import {
  caseTagGroups,
  casePassCounts,
  casesInRun,
  CONFIG_LETTERS,
  countLevel,
  filterTitle,
  fmtQuality,
  fmtSeconds,
  fmtUsd,
  listText,
  memoryText,
  previousText,
  runLabel,
  toCaseFilter,
  type PassCount,
  type RateLevel,
  type TestCase,
  type TestRun,
} from './testModel';
import s from './Tests.module.css';

const LEVEL_TONE: Record<RateLevel, TagTone> = { good: 'success', mid: 'warning', bad: 'danger', empty: 'neutral' };

interface CaseResultViewProps {
  run: TestRun;
  cases: TestCase[];
  caseId: string;
  filter: { key: string; value: string } | null;
  onBack: () => void;
  onSelect: (id: string) => void;
}

// 케이스 결과: 왼쪽 케이스 목록(설정별 반복 통과 수), 오른쪽 고른 케이스의 준비 상태와 설정별 시도.
export function CaseResultView({ run, cases, caseId, filter: rawFilter, onBack, onSelect }: CaseResultViewProps) {
  const filter = toCaseFilter(rawFilter);
  const list = casesInRun(run, cases, filter);
  const selected = list.find((c) => c.id === caseId) ?? list[0];

  return (
    <>
      <div className={s.runBar}>
        <Button variant="outline" onClick={onBack}>
          결과 비교로
        </Button>
        <span className={s.secondary}>{runLabel(run)} ›</span>
        {filter && <Tag tone="info">{filterTitle(filter)}</Tag>}
        <span className={s.secondary}>{list.length} 케이스</span>
      </div>
      {!selected ? (
        <Notice>이 실행에 해당하는 케이스가 없어요.</Notice>
      ) : (
        <div className={s.caseMain}>
          <div className={`card ${s.caseList}`} role="listbox" aria-label="케이스">
            <div className={s.caseListHead}>
              <span className={s.flex}>케이스</span>
              {run.configs.map((_, i) => (
                <span key={i} className={s.caseListLetter}>
                  {CONFIG_LETTERS[i]}
                </span>
              ))}
            </div>
            {list.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={c.id === selected.id}
                className={`${s.caseListRow} ${c.id === selected.id ? s.caseListOn : ''}`}
                onClick={() => onSelect(c.id)}
              >
                <span className={s.caseListText}>
                  <span className={`mono ${s.id}`}>{c.id}</span>
                  <span className={s.ellipsis}>{c.message}</span>
                </span>
                {casePassCounts(run, c.id).map((n, i) => (
                  <RateCell key={i} level={countLevel(n)} size="sm">
                    {fmtCount(n)}
                  </RateCell>
                ))}
              </button>
            ))}
          </div>
          <CaseDetail key={selected.id} run={run} c={selected} />
        </div>
      )}
    </>
  );
}

const fmtCount = (n: PassCount) => (n.total ? `${n.passed}/${n.total}` : '–');

function CaseDetail({ run, c }: { run: TestRun; c: TestCase }) {
  const counts = casePassCounts(run, c.id);
  return (
    <div className={s.detail}>
      <section className={`card ${s.caseHead}`}>
        <h2 className={s.caseTitle}>
          <span className={`mono ${s.caseTitleId}`}>{c.id}</span>“{c.message}”
        </h2>
        <div className={s.tagGroups}>
          {caseTagGroups(c).map((g) => (
            <div key={g.title} className={s.tagGroup}>
              <span className={s.tagGroupTitle}>{g.title}</span>
              <div className={s.tags}>
                {g.values.map((value) => (
                  <Tag key={value} tone={g.tone}>
                    {value}
                  </Tag>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={s.setup}>
          <Meta label="이전 대화" value={previousText(c)} />
          <Meta label="존재하는 목록" value={listText(c)} />
          <Meta label="시작 기억" value={memoryText(c)} />
        </div>
        <Meta label="상황" value={c.expected} />
      </section>
      <div className={s.byConfig}>
        {run.configs.map((config, i) => (
          <section key={i} className={`card ${s.configCard}`}>
            <div className={s.configHead}>
              <ConfigChip index={i} config={config} />
              <span className={s.spacer} />
              <Tag tone={LEVEL_TONE[countLevel(counts[i]!)]}>통과 {fmtCount(counts[i]!)}</Tag>
            </div>
            <Attempts run={run} c={c} config={i} />
          </section>
        ))}
      </div>
    </div>
  );
}

function Attempts({ run, c, config }: { run: TestRun; c: TestCase; config: number }) {
  const view = useViewState();
  const attempts = run.attempts.filter((a) => a.caseId === c.id && a.config === config).sort((a, b) => a.repeat - b.repeat);
  const [repeat, setRepeat] = useState(attempts[0]?.repeat ?? 1);
  const a = attempts.find((x) => x.repeat === repeat) ?? attempts[0];
  if (!a) return <p className={s.secondary}>아직 끝난 시도가 없어요.</p>;
  const name = (x: (typeof attempts)[number]) => `시도 ${x.repeat} · ${x.passed ? '통과' : '실패'}`;

  return (
    <>
      <div>
        <Dropdown ariaLabel="시도 고르기" label={name(a)} value={String(a.repeat)} onSelect={(v) => setRepeat(Number(v))} items={attempts.map((x) => ({ value: String(x.repeat), label: name(x) }))} />
      </div>
      <div className={s.metrics}>
        <Meta label="품질" value={fmtQuality(a.quality)} mono wide />
        <Meta label="응답" value={fmtSeconds(a.latencyMs)} mono wide />
        <Meta label="비용" value={fmtUsd(a.costUsd)} mono wide />
        <Meta label="채점 비용" value={fmtUsd(a.graderCostUsd)} mono wide />
      </div>
      <div>
        {c.checks.map((check, k) => (
          <CheckRow key={k} check={check} result={a.checks[k]} />
        ))}
      </div>
      <div className={s.reason}>
        <span className={s.boxLabel}>{a.passed ? '채점 이유' : '실패 이유'}</span>
        <p>{a.reason}</p>
      </div>
      {a.reply && (
        <div className={s.reply}>
          <span className={s.boxLabel}>탱글 응답</span>
          <p>{a.reply}</p>
        </div>
      )}
      {a.turnId && (
        <div>
          <Button variant="text" onClick={() => view.openRun(a.turnId!)}>
            <ArrowRightIcon />
            요청 상세 보기
          </Button>
        </div>
      )}
    </>
  );
}
