import { useMemo, useState } from 'react';
import { useRun } from '../../api/queries';
import { isErrorResponse, type RunDetailResponse } from '../../api/types';
import { useViewState } from '../../app/useViewState';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { CopyId } from '../../components/CopyId';
import { PlayIcon } from '../../components/icons';
import { Inspector, InspectorBody, InspectorHero, InspectorMessage } from '../../components/Inspector';
import { fmtCost, fmtDateTime, fmtMs } from '../../lib/format';
import { inputText } from '../../lib/input';
import { PATH_LABEL, RUN_STATUS } from '../../lib/status';
import { summaryOf } from '../runs/summary';
import { displaySteps, modelSteps, type DisplayStep } from './displaySteps';
import { AppBubble } from './reply/AppBubble';
import s from './RunInspector.module.css';
import { ModelStep } from './steps/ModelStep';
import { ServerStep } from './steps/ServerStep';
import { ToolStep } from './steps/ToolStep';
import { TokenBars } from './TokenBars';
import { TokenTable } from './TokenTable';
import { UserInput } from './UserInput';

interface RunInspectorProps {
  runId: string;
  fromCase: string | null;
}

export function RunInspector({ runId, fromCase }: RunInspectorProps) {
  const view = useViewState();
  const q = useRun(runId);
  return (
    <Inspector label="요청 상세" onClose={view.close}>
      {q.data ? (
        <RunDetail detail={q.data} fromCase={fromCase} onBack={view.backToCase} onPlay={view.openReplay} />
      ) : q.isError ? (
        <InspectorMessage>요청을 불러오지 못했어요. {q.error.message}</InspectorMessage>
      ) : (
        <InspectorMessage>불러오는 중…</InspectorMessage>
      )}
    </Inspector>
  );
}

interface RunDetailProps {
  detail: RunDetailResponse;
  fromCase: string | null;
  onBack: () => void;
  onPlay: () => void;
}

function RunDetail({ detail, fromCase, onBack, onPlay }: RunDetailProps) {
  const { run } = detail;
  const [sel, setSel] = useState<number | null>(null);
  const steps = useMemo(() => displaySteps(run, detail.steps), [run, detail.steps]);
  const models = modelSteps(steps);
  const st = RUN_STATUS[run.status];
  const res = detail.response;
  const turnId = res ? (isErrorResponse(res) ? res.turn_id : res.turn_id) : null;
  const meta: { label: string; value: string; mono?: boolean; id?: boolean }[] = [
    { label: 'turn_id', value: turnId ?? '-', mono: true, id: !!turnId },
    { label: 'request_id', value: run.request_id, mono: true, id: true },
    { label: '시각', value: fmtDateTime(run.started_at), mono: true },
    { label: '처리 경로', value: PATH_LABEL[run.path] },
    { label: '모델', value: run.model ?? '사용 안 함' },
    { label: '모델 · 도구 호출', value: run.model_calls + '회 · ' + run.tool_calls + '회' },
    { label: '총 소요시간', value: fmtMs(run.duration_ms), mono: true },
    { label: '총 비용', value: fmtCost(run.cost_usd), mono: true },
  ];
  const toggle = (seq: number) => setSel((cur) => (cur === seq ? null : seq));

  return (
    <>
      <InspectorHero>
        {fromCase && (
          <button type="button" className={s.back} onClick={onBack}>
            ‹ {fromCase} 실행 목록
          </button>
        )}
        <div className={s.badges}>
          {run.test_case_id ? (
            <Badge mono bg="var(--color-canvas)" fg="var(--color-ink)">
              {run.test_case_id}
            </Badge>
          ) : (
            <Badge bg="var(--color-canvas)" fg="var(--color-ink)">
              실제 요청
            </Badge>
          )}
          <Badge bg={st.bg} fg={st.fg} dot={st.dot}>
            {st.label}
          </Badge>
          <Button variant="primary" onClick={onPlay}>
            <PlayIcon />
            재생
          </Button>
        </div>
        <h1 className={s.title}>{summaryOf(run)}</h1>
        <div className={s.meta}>
          {meta.map((m) => (
            <div key={m.label} className={s.metaItem}>
              <span className={s.metaLabel}>{m.label}</span>
              {m.id ? (
                <CopyId id={m.value} className={s.metaValue} />
              ) : (
                <span className={`${m.mono ? 'mono' : ''} ${s.metaValue}`} title={m.value}>
                  {m.value}
                </span>
              )}
            </div>
          ))}
        </div>
      </InspectorHero>
      <InspectorBody>
        <TokenBars run={run} />
        <div className={s.columns}>
          <div className={s.timeline}>
            <UserInput text={inputText(detail.input)} history={detail.history} />
            {steps.map((step) => (
              <StepView key={step.seq} step={step} selected={sel === step.seq} onSelect={() => toggle(step.seq)} />
            ))}
            <AppBubble detail={detail} />
          </div>
          <TokenTable run={run} models={models} selected={sel} onSelect={setSel} />
        </div>
      </InspectorBody>
    </>
  );
}

function StepView({ step, selected, onSelect }: { step: DisplayStep; selected: boolean; onSelect: () => void }) {
  if (step.kind === 'model') return <ModelStep step={step} selected={selected} onSelect={onSelect} />;
  if (step.kind === 'tool') return <ToolStep step={step} selected={selected} onSelect={onSelect} />;
  return <ServerStep step={step} selected={selected} onSelect={onSelect} />;
}
