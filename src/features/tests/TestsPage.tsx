import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { readTestView, writeTestView, type TestView } from '../../app/viewParams';
import { Button } from '../../components/Button';
import { PlusIcon } from '../../components/icons';
import { Notice, PageHeader, PageMain } from '../../components/Page';
import { CaseResultView } from './CaseResultView';
import { CompareView } from './CompareView';
import { NewRunModal } from './NewRunModal';
import { Dropdown, Tag, type TagTone } from './parts';
import { RunningView } from './RunningView';
import { TestSetView } from './TestSetView';
import { RUN_STATUS_LABEL, runLabel, type RunStatus, type TestRun } from './testModel';
import { CASE_FILE, TEST_SET } from './testSet';
import s from './Tests.module.css';
import { useTestRuns } from './useTestRuns';

const STATUS_TONE: Record<RunStatus, TagTone> = { running: 'info', done: 'success', stopped: 'neutral' };

// 테스트 탭. 테스트 셋(케이스 분포와 목록)과 실행 결과(진행 중·결과 비교·케이스 결과)를 오간다.
// 케이스는 케이스 파일(testSet.json)이다. 실행은 live 모드에서 고른 서버의 탱글 서버가 돌리고, mock 모드에서는 예시 데이터다(sampleData.ts).
export function TestsPage() {
  const set = TEST_SET;
  const [params, setParams] = useSearchParams();
  const view = readTestView(params);
  const { runs, run, lastDone, grader, loading, error, canStart, estimate, start, stop } = useTestRuns(view.run);
  const [creating, setCreating] = useState(false);
  const go = (next: Partial<TestView>) => setParams((p) => writeTestView(p, { ...readTestView(p), ...next }));

  return (
    <>
      <PageHeader title="테스트" />
      <PageMain>
        <div className={s.page}>
          <div className={s.toolbar}>
            <div className={s.tabs} role="tablist" aria-label="테스트 화면">
              {(['set', 'results'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={view.tab === tab}
                  className={`${s.tab} ${view.tab === tab ? s.tabOn : ''}`}
                  onClick={() => go({ tab, case: null, filter: null })}
                >
                  {tab === 'set' ? '테스트 셋' : '실행 결과'}
                </button>
              ))}
            </div>
            <span className={s.spacer} />
            {view.tab === 'set' && (
              <Button variant="outline" onClick={openCaseFile}>
                케이스 파일 열기
              </Button>
            )}
            <Button variant="primary" disabled={!canStart} title={canStart ? undefined : '운영 서버에서는 실행하지 않아요'} onClick={() => setCreating(true)}>
              <PlusIcon />
              새 실행
            </Button>
          </div>
          {view.tab === 'set' ? (
            <TestSetView set={set} lastRun={lastDone} onOpenCase={(id) => go({ tab: 'results', run: (lastDone ?? run)?.id ?? null, case: id, filter: null })} />
          ) : error ? (
            <Notice>실행 기록을 불러오지 못했어요. {error.message}</Notice>
          ) : loading ? (
            <Notice>불러오는 중…</Notice>
          ) : !run ? (
            <Notice>아직 실행이 없어요.</Notice>
          ) : view.case ? (
            <CaseResultView
              run={run}
              cases={set.cases}
              caseId={view.case}
              filter={view.filter}
              onBack={() => go({ case: null, filter: null })}
              onSelect={(id) => go({ case: id })}
            />
          ) : (
            <>
              <RunBar runs={runs} run={run} onSelect={(id) => go({ run: id })} onStop={() => stop(run.id)} />
              {run.status === 'running' ? (
                <RunningView run={run} cases={set.cases} />
              ) : (
                <CompareView run={run} cases={set.cases} onOpenValue={(key, value, caseId) => go({ case: caseId, filter: { key, value } })} />
              )}
            </>
          )}
        </div>
      </PageMain>
      {creating && (
        <NewRunModal
          cases={set.cases}
          lastRun={lastDone}
          grader={grader}
          estimate={estimate}
          onClose={() => setCreating(false)}
          onStart={async (input) => {
            const id = await start(input);
            setCreating(false);
            go({ tab: 'results', run: id, case: null, filter: null });
          }}
        />
      )}
    </>
  );
}

function RunBar({ runs, run, onSelect, onStop }: { runs: TestRun[]; run: TestRun; onSelect: (id: string) => void; onStop: () => Promise<void> }) {
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stop = () => {
    setStopping(true);
    setError(null);
    onStop()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '중단하지 못했어요.'))
      .finally(() => setStopping(false));
  };
  return (
    <div className={s.runBar}>
      <Dropdown
        ariaLabel="실행 고르기"
        label={runLabel(run)}
        value={run.id}
        onSelect={onSelect}
        items={runs.map((r) => ({
          value: r.id,
          label: (
            <>
              <span className={s.menuLabel}>{runLabel(r)}</span>
              <Tag tone={STATUS_TONE[r.status]}>{RUN_STATUS_LABEL[r.status]}</Tag>
            </>
          ),
        }))}
      />
      <Tag tone={STATUS_TONE[run.status]}>{RUN_STATUS_LABEL[run.status]}</Tag>
      <span className={s.spacer} />
      {error && <span className={s.danger}>{error}</span>}
      {run.status === 'running' && (
        <Button variant="outline" disabled={stopping} onClick={stop}>
          중단
        </Button>
      )}
    </div>
  );
}

/** 케이스 파일을 새 탭에 JSON으로 연다. */
function openCaseFile() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(CASE_FILE, null, 2)], { type: 'application/json' }));
  window.open(url, '_blank', 'noopener');
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
