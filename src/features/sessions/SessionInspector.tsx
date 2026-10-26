import { useMemo, useState } from 'react';
import { useSession } from '../../api/queries';
import type { SessionDetailResponse } from '../../api/types';
import { useViewState } from '../../app/useViewState';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PlayIcon } from '../../components/icons';
import { Inspector, InspectorBadges, InspectorBody, InspectorHead, InspectorMessage, InspectorTitle, MetaGrid, type MetaItem } from '../../components/Inspector';
import { fmtCost, fmtDateTime, fmtInt, fmtStamp } from '../../lib/format';
import { RUN_STATUS } from '../../lib/status';
import { displaySteps, stepsDigest } from '../run-detail/displaySteps';
import { ResponseView } from '../run-detail/reply/ResponseView';
import { StepView } from '../run-detail/steps/StepView';
import { TokenBars } from '../run-detail/TokenBars';
import { UserInput } from '../run-detail/UserInput';
import s from './SessionInspector.module.css';
import { turnRows, type TurnRow } from './sessionModel';

export function SessionInspector({ sessionId }: { sessionId: string }) {
  const view = useViewState();
  const q = useSession(sessionId);
  return (
    <Inspector label="대화 상세" onClose={view.close}>
      {q.data ? (
        <SessionDetail detail={q.data} onOpenTurn={(runId) => view.openTurn(sessionId, runId)} onPlay={view.openReplay} />
      ) : q.isError ? (
        <InspectorMessage>대화를 불러오지 못했어요. {q.error.message}</InspectorMessage>
      ) : (
        <InspectorMessage>불러오는 중…</InspectorMessage>
      )}
    </Inspector>
  );
}

function SessionDetail({ detail, onOpenTurn, onPlay }: { detail: SessionDetailResponse; onOpenTurn: (runId: string) => void; onPlay: () => void }) {
  const c = detail.session;
  const rows = useMemo(() => turnRows(detail.turns, detail.omitted_turns), [detail]);
  const meta: MetaItem[] = [
    { label: 'session_id', value: c.session_id, mono: true, id: true },
    { label: '처음 턴', value: fmtDateTime(c.first_started_at), mono: true },
    { label: '마지막 턴', value: fmtDateTime(c.last_started_at), mono: true },
    { label: '모델 · 도구 호출', value: c.model_calls + '회 · ' + c.tool_calls + '회' },
    { label: '총 토큰', value: fmtInt(c.input_tokens + c.output_tokens), mono: true },
    { label: '총 비용', value: fmtCost(c.cost_usd), mono: true },
  ];
  return (
    <>
      <InspectorHead>
        <InspectorBadges>
          {c.test_turns > 0 ? (
            <Badge mono ring>
              {c.test_case_id ?? '테스트'}
            </Badge>
          ) : (
            <Badge bg="var(--surface-inverse)" fg="var(--text-inverse)">
              실제 요청
            </Badge>
          )}
          <Badge ring>턴 {c.turns}</Badge>
          {c.attention_turns > 0 && (
            <Badge bg="var(--surface-warning)" fg="var(--text-warning)">
              주의 {c.attention_turns}
            </Badge>
          )}
          <Button variant="primary" onClick={onPlay}>
            <PlayIcon />
            대화 재생
          </Button>
        </InspectorBadges>
        <InspectorTitle>{c.last_input_preview || '(입력 없음)'}</InspectorTitle>
        <MetaGrid items={meta} />
      </InspectorHead>
      <InspectorBody>
        <TokenBars run={c} />
        {detail.omitted_turns > 0 && <div className={s.omitted}>앞선 {detail.omitted_turns}턴은 생략됐어요. 합계는 세션 전체 기준이에요.</div>}
        {rows.map((row, i) => (
          <TurnBlock key={row.turn.run.turn_id} row={row} last={i === rows.length - 1} onOpen={() => onOpenTurn(row.turn.run.turn_id)} />
        ))}
      </InspectorBody>
    </>
  );
}

function TurnBlock({ row, last, onOpen }: { row: TurnRow; last: boolean; onOpen: () => void }) {
  const { run } = row.turn;
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const steps = useMemo(() => displaySteps(run, row.turn.steps), [run, row.turn.steps]);
  const st = RUN_STATUS[run.status];
  return (
    <section className={s.turn} aria-label={'턴 ' + row.index}>
      <div className={s.turnHead}>
        <span className={s.turnNo}>턴 {row.index}</span>
        <span className={`mono ${s.turnTime}`}>{fmtStamp(run.started_at)}</span>
        {run.test_case_id && (
          <Badge mono ring>
            {run.test_case_id}
          </Badge>
        )}
        <Badge bg={st.bg} fg={st.fg} dot={st.dot}>
          {st.label}
        </Badge>
        <span className={s.turnActions}>
          <Button variant="soft" onClick={onOpen}>
            상세 보기
          </Button>
        </span>
      </div>
      <UserInput input={row.turn.input} />
      <button type="button" className={s.stepsToggle} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span>{open ? '▾' : '▸'}</span>
        <span>
          처리 단계 {steps.length}개 · {stepsDigest(row.turn.steps)}
        </span>
      </button>
      {open && (
        <div className={s.steps}>
          {steps.map((step) => (
            <StepView key={step.seq} step={step} selected={sel === step.seq} onSelect={() => setSel((cur) => (cur === step.seq ? null : step.seq))} />
          ))}
        </div>
      )}
      <ResponseView response={row.turn.response} status={run.status} />
      <div className={`mono ${s.cum}`}>
        <span>누적 · 모델 {row.cum.modelCalls}회</span>
        <span>도구 {row.cum.toolCalls}회</span>
        <span>토큰 {fmtInt(row.cum.tokens)}</span>
        <span>비용 {fmtCost(row.cum.cost)}</span>
        {row.cum.attention > 0 && <span>주의 {row.cum.attention}</span>}
      </div>
      {!last && <div className={s.divider} />}
    </section>
  );
}
