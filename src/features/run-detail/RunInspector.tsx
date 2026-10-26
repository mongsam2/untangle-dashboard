import { useMemo, useState } from 'react';
import { useRun } from '../../api/queries';
import type { RunDetailResponse } from '../../api/types';
import { useViewState } from '../../app/useViewState';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PlayIcon } from '../../components/icons';
import { Inspector, InspectorBack, InspectorBadges, InspectorBody, InspectorHead, InspectorMessage, InspectorTitle, MetaGrid, type MetaItem } from '../../components/Inspector';
import { fmtCost, fmtDateTime, fmtMs } from '../../lib/format';
import { RUN_STATUS, RUN_STATUS_HINT } from '../../lib/status';
import { summaryOf } from '../runs/RunTable';
import { displaySteps, modelSteps, stepsDigest } from './displaySteps';
import { ResponseView } from './reply/ResponseView';
import s from './RunInspector.module.css';
import { StepView } from './steps/StepView';
import { TokenBars } from './TokenBars';
import { TokenTable } from './TokenTable';
import { UserInput } from './UserInput';

interface RunInspectorProps {
  runId: string;
  fromCase: string | null;
  /** 세션 인스펙터에서 열었으면 그 세션 ID. 돌아가는 링크를 보인다. */
  fromSession: string | null;
}

export function RunInspector({ runId, fromCase, fromSession }: RunInspectorProps) {
  const view = useViewState();
  const q = useRun(runId);
  return (
    <Inspector label="요청 상세" onClose={view.close}>
      {q.data ? (
        <RunDetail
          detail={q.data}
          fromCase={fromCase}
          fromSession={fromSession}
          onBack={view.backToCase}
          onBackToSession={view.backToSession}
          onOpenSession={() => view.openSession(q.data.run.session_id)}
          onPlay={view.openReplay}
        />
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
  fromSession: string | null;
  onBack: () => void;
  onBackToSession: () => void;
  onOpenSession: () => void;
  onPlay: () => void;
}

function RunDetail({ detail, fromCase, fromSession, onBack, onBackToSession, onOpenSession, onPlay }: RunDetailProps) {
  const { run } = detail;
  const [sel, setSel] = useState<number | null>(null);
  const steps = useMemo(() => displaySteps(run, detail.steps), [run, detail.steps]);
  const models = modelSteps(steps);
  const st = RUN_STATUS[run.status];
  const meta: MetaItem[] = [
    { label: 'turn_id', value: run.turn_id, mono: true, id: true },
    { label: 'session_id', value: run.session_id, mono: true, id: true },
    { label: '시각', value: fmtDateTime(run.started_at), mono: true },
    { label: '모델', value: run.model ?? '부르지 않음' },
    { label: '모델 · 도구 호출', value: run.model_calls + '회 · ' + run.tool_calls + '회' + (run.corrections ? ' · 보정 ' + run.corrections : '') },
    { label: '총 소요시간', value: run.duration_ms === null ? '처리 중' : fmtMs(run.duration_ms), mono: true },
    { label: '총 비용', value: fmtCost(run.cost_usd), mono: true },
  ];
  const toggle = (seq: number) => setSel((cur) => (cur === seq ? null : seq));

  return (
    <>
      <InspectorHead>
        {fromCase && <InspectorBack onClick={onBack}>{fromCase} 실행 목록</InspectorBack>}
        {fromSession && <InspectorBack onClick={onBackToSession}>대화로 돌아가기</InspectorBack>}
        <InspectorBadges>
          {run.test_case_id ? (
            <Badge mono ring>
              {run.test_case_id}
            </Badge>
          ) : (
            <Badge bg="var(--surface-inverse)" fg="var(--text-inverse)">
              실제 요청
            </Badge>
          )}
          <Badge bg={st.bg} fg={st.fg} dot={st.dot} title={RUN_STATUS_HINT[run.status]}>
            {st.label}
          </Badge>
          <Button variant="primary" onClick={onPlay}>
            <PlayIcon />
            재생
          </Button>
          {!fromSession && (
            <Button variant="outline" onClick={onOpenSession}>
              대화 보기
            </Button>
          )}
        </InspectorBadges>
        <InspectorTitle>{summaryOf(run)}</InspectorTitle>
        <MetaGrid items={meta} />
      </InspectorHead>
      <InspectorBody>
        <span className={s.hint}>{run.finished_at === null ? '아직 처리 중인 요청이라 저장된 응답이 없어요.' : RUN_STATUS_HINT[run.status]}</span>
        {models.length > 0 && <TokenBars run={run} />}
        <div className={s.columns}>
          <div className={s.timeline}>
            <UserInput input={detail.input} />
            <div className={s.digest}>
              <span>처리 단계 {steps.length}개</span>
              <span>·</span>
              <span>{stepsDigest(detail.steps)}</span>
            </div>
            {steps.map((step) => (
              <StepView key={step.seq} step={step} selected={sel === step.seq} onSelect={() => toggle(step.seq)} />
            ))}
            <ResponseView response={detail.response} status={run.status} />
          </div>
          <TokenTable run={run} models={models} selected={sel} onSelect={setSel} />
        </div>
      </InspectorBody>
    </>
  );
}
