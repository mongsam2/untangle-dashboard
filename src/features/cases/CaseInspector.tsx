import { useCase } from '../../api/queries';
import type { CaseDetailResponse } from '../../api/types';
import { useViewState } from '../../app/useViewState';
import { Badge } from '../../components/Badge';
import { Inspector, InspectorBadges, InspectorBody, InspectorHead, InspectorMessage, InspectorTitle, MetaGrid } from '../../components/Inspector';
import { caseTitle } from '../../lib/cases';
import { fmtCost, fmtDateTime, fmtInt, fmtMs } from '../../lib/format';
import { RUN_STATUS, RUN_STATUS_ORDER } from '../../lib/status';
import { RunTable } from '../runs/RunTable';
import s from './CaseInspector.module.css';

export function CaseInspector({ caseId }: { caseId: string }) {
  const view = useViewState();
  const q = useCase(caseId);
  return (
    <Inspector label="케이스 상세" onClose={view.close}>
      {q.data ? (
        <CaseDetail caseId={caseId} detail={q.data} selectedRun={view.run} onOpenRun={(id) => view.openRun(id, caseId)} />
      ) : q.isError ? (
        <InspectorMessage>케이스를 불러오지 못했어요. {q.error.message}</InspectorMessage>
      ) : (
        <InspectorMessage>불러오는 중…</InspectorMessage>
      )}
    </Inspector>
  );
}

function CaseDetail({ caseId, detail, selectedRun, onOpenRun }: { caseId: string; detail: CaseDetailResponse; selectedRun: string | null; onOpenRun: (id: string) => void }) {
  const c = detail.stats;
  const tiles = [
    { label: '실행', value: fmtInt(c.runs) + '회' },
    { label: '평균 모델 호출', value: c.avg_model_calls === null ? '-' : c.avg_model_calls.toFixed(1) + '회' },
    { label: '평균 도구 호출', value: c.avg_tool_calls === null ? '-' : c.avg_tool_calls.toFixed(1) + '회' },
    { label: '평균 토큰', value: fmtInt(c.avg_total_tokens ?? 0) },
    { label: '평균 비용', value: fmtCost(c.avg_cost_usd) },
    { label: '평균 소요시간', value: fmtMs(c.avg_duration_ms) },
  ];
  const counts: Record<string, number> = { normal: c.normal, tool_failed: c.tool_failed, blocked_input: c.blocked_input, limit_exceeded: c.limit_exceeded, output_rejected: c.output_rejected, error: c.error };
  return (
    <>
      <InspectorHead>
        <InspectorBadges>
          <Badge mono ring>
            {caseId}
          </Badge>
          <Badge ring>테스트 케이스</Badge>
        </InspectorBadges>
        <InspectorTitle>{caseTitle(caseId)}</InspectorTitle>
        <MetaGrid items={[{ label: '마지막 실행', value: c.last_started_at ? fmtDateTime(c.last_started_at) : '-', mono: true }]} />
      </InspectorHead>
      <InspectorBody>
        <div className={s.stats}>
          {tiles.map((t) => (
            <div key={t.label} className={`card ${s.stat}`}>
              <span className={s.statLabel}>{t.label}</span>
              <span className={`mono ${s.statValue}`}>{t.value}</span>
            </div>
          ))}
        </div>
        <div className={s.statuses}>
          {RUN_STATUS_ORDER.filter((st) => counts[st]).map((st) => (
            <Badge key={st} bg={RUN_STATUS[st].bg} fg={RUN_STATUS[st].fg} dot={RUN_STATUS[st].dot}>
              {RUN_STATUS[st].label} {counts[st]}
            </Badge>
          ))}
        </div>
        <RunTable title={`실행 ${detail.runs.length}건`} items={detail.runs} selectedId={selectedRun} onOpen={onOpenRun} />
      </InspectorBody>
    </>
  );
}
