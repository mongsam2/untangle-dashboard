import { useMemo, useState } from 'react';
import { useConversation } from '../../api/queries';
import type { ConversationDetailResponse } from '../../api/types';
import { useViewState } from '../../app/useViewState';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { CopyId } from '../../components/CopyId';
import { PlayIcon } from '../../components/icons';
import { Inspector, InspectorBody, InspectorHero, InspectorMessage } from '../../components/Inspector';
import { fmtCost, fmtDateTime, fmtInt, fmtMs } from '../../lib/format';
import { inputText } from '../../lib/input';
import { RUN_STATUS, SOURCE } from '../../lib/status';
import { AppBubble } from '../run-detail/reply/AppBubble';
import { StepView } from '../run-detail/steps/StepView';
import { asRunDetail, conversationSummary, sourceOfConversation, turnRows, type TurnRow } from './conversationModel';
import s from './ConversationInspector.module.css';

export function ConversationInspector({ conversationId }: { conversationId: string }) {
  const view = useViewState();
  const q = useConversation(conversationId);
  return (
    <Inspector label="대화 상세" onClose={view.close}>
      {q.data ? (
        <ConversationDetail
          detail={q.data}
          onPlay={view.openReplay}
          onOpenTurn={(runId) => view.openTurn(conversationId, runId)}
        />
      ) : q.isError ? (
        <InspectorMessage>대화를 불러오지 못했어요. {q.error.message}</InspectorMessage>
      ) : (
        <InspectorMessage>불러오는 중…</InspectorMessage>
      )}
    </Inspector>
  );
}

interface ConversationDetailProps {
  detail: ConversationDetailResponse;
  onPlay: () => void;
  onOpenTurn: (runId: string) => void;
}

// 대화의 요청을 시작 순서로 쌓는다. 앞 턴의 모델 호출·도구 실행이 그대로 남고, 턴마다 그때까지의 합계를 붙인다.
function ConversationDetail({ detail, onPlay, onOpenTurn }: ConversationDetailProps) {
  const c = detail.conversation;
  const rows = useMemo(() => turnRows(detail), [detail]);
  const kind = sourceOfConversation(c);
  const meta: { label: string; value: string; id?: boolean }[] = [
    { label: 'conversation_id', value: c.conversation_id, id: true },
    { label: 'user_id', value: c.user_id, id: true },
    { label: '시작', value: fmtDateTime(c.started_at) },
    { label: '마지막 요청', value: fmtDateTime(c.last_started_at) },
    { label: '모델 · 도구 호출', value: c.model_calls + '회 · ' + c.tool_calls + '회' },
    { label: '토큰(입력 · 출력)', value: fmtInt(c.input_tokens) + ' · ' + fmtInt(c.output_tokens) },
    { label: '총 소요시간', value: fmtMs(c.duration_ms) },
    { label: '총 비용', value: fmtCost(c.cost_usd) },
  ];

  return (
    <>
      <InspectorHero>
        <div className={s.badges}>
          <Badge bg="var(--color-canvas)" fg="var(--color-ink)">
            {kind === 'mixed' ? '테스트·실제 섞임' : SOURCE[kind].label}
          </Badge>
          <Badge bg="var(--color-canvas)" fg="var(--color-ink)">
            턴 {c.turns}개
          </Badge>
          {c.attention_turns > 0 && (
            <Badge bg={RUN_STATUS.tool_failed.bg} fg={RUN_STATUS.tool_failed.fg} dot={RUN_STATUS.tool_failed.dot}>
              주의 턴 {c.attention_turns}개
            </Badge>
          )}
          <Button variant="primary" onClick={onPlay} disabled={rows.length === 0}>
            <PlayIcon />
            대화 재생
          </Button>
        </div>
        <h1 className={s.title}>{conversationSummary(c)}</h1>
        <div className={s.meta}>
          {meta.map((m) => (
            <div key={m.label} className={s.metaItem}>
              <span className={s.metaLabel}>{m.label}</span>
              {m.id ? (
                <CopyId id={m.value} className={s.metaValue} />
              ) : (
                <span className={`mono ${s.metaValue}`} title={m.value}>
                  {m.value}
                </span>
              )}
            </div>
          ))}
        </div>
      </InspectorHero>
      <InspectorBody>
        <div className={s.turns}>
          {detail.omitted_turns > 0 && (
            <div className={`card ${s.omitted}`}>
              오래된 요청 {detail.omitted_turns}건은 빼고 최근 {rows.length}건만 보여요. 턴 머리의 합계는 보이는 턴부터 세요.
            </div>
          )}
          {rows.map((row) => (
            <Turn key={row.turn.run.request_id} row={row} onOpen={() => onOpenTurn(row.turn.run.request_id)} />
          ))}
          {rows.length === 0 && <div className={`card ${s.omitted}`}>보여 줄 요청이 없어요.</div>}
        </div>
      </InspectorBody>
    </>
  );
}

function Turn({ row, onOpen }: { row: TurnRow; onOpen: () => void }) {
  const { turn, totals } = row;
  const run = turn.run;
  const st = RUN_STATUS[run.status];
  const [open, setOpen] = useState(true);
  const [sel, setSel] = useState<number | null>(null);
  const detail = useMemo(() => asRunDetail(turn), [turn]);

  return (
    <section className={s.turn} aria-label={'턴 ' + row.number}>
      <div className={s.turnHead}>
        <span className={s.turnNo}>턴 {row.number}</span>
        <span className={`mono ${s.muted}`}>{fmtDateTime(run.started_at)}</span>
        {run.test_case_id && (
          <Badge mono bg="var(--color-divider)" fg="var(--color-ink)">
            {run.test_case_id}
          </Badge>
        )}
        {run.status !== 'normal' && (
          <Badge bg={st.bg} fg={st.fg} dot={st.dot}>
            {st.label}
          </Badge>
        )}
        <span className={s.headRight}>
          <Button variant="text" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? '단계 접기' : '단계 ' + row.steps.length + '개 펼치기'}
          </Button>
          <Button variant="text" onClick={onOpen}>
            요청 상세
          </Button>
        </span>
      </div>
      <div className={s.cum} aria-label="이 턴까지 쌓인 합계">
        <span>
          이번 턴 <span className="mono">{run.model_calls}·{run.tool_calls}</span>회 ·{' '}
          <span className="mono">{fmtInt(run.input_tokens + run.output_tokens)}</span> 토큰 ·{' '}
          <span className="mono">{fmtCost(run.cost_usd)}</span>
        </span>
        <span className={s.cumTotal}>
          누적 모델 <span className="mono">{totals.modelCalls}</span> · 도구 <span className="mono">{totals.toolCalls}</span> · 입력{' '}
          <span className="mono">{fmtInt(totals.inputTokens)}</span> · 출력 <span className="mono">{fmtInt(totals.outputTokens)}</span> · 비용{' '}
          <span className="mono">{fmtCost(totals.costUsd)}</span>
        </span>
      </div>
      <div className={`card ${s.input}`}>
        <span className="th">사용자 입력</span>
        <span className={s.inputText}>{inputText(turn.input)}</span>
      </div>
      {open && row.steps.map((step) => <StepView key={step.seq} step={step} selected={sel === step.seq} onSelect={() => setSel((cur) => (cur === step.seq ? null : step.seq))} />)}
      <AppBubble detail={detail} />
    </section>
  );
}
