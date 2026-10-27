import { useState } from 'react';
import { useRunSummary, useStats } from '../../api/queries';
import { useViewState } from '../../app/useViewState';
import { Collapsible } from '../../components/Collapsible';
import { KpiRow, Notice, PageHeader, PageMain } from '../../components/Page';
import { Segmented } from '../../components/Segmented';
import { TOOLS } from '../../lib/kinds';
import { FilterBar } from '../runs/FilterBar';
import { useRunFilters } from '../runs/useRunFilters';
import { CaseTable } from './CaseTable';
import { GuardrailTable } from './GuardrailTable';
import { computeKde } from './kde';
import { RatioBar } from './RatioBar';
import { caseRows, guardRows, statTiles, statusSegs, toolDonuts, toolRows, type ToolSort } from './statsModel';
import { TokenDensity } from './TokenDensity';
import { ToolDonuts } from './ToolDonuts';
import { ToolTable } from './ToolTable';

type BlockKey = 'tools' | 'guards' | 'kde' | 'status' | 'cases';

export function StatsPage() {
  const { filters } = useRunFilters();
  const view = useViewState();
  const stats = useStats(filters);
  const summary = useRunSummary(filters);
  // 집계 블록은 도구·가드레일만 펼친 채 시작한다.
  const [open, setOpen] = useState<Partial<Record<BlockKey, boolean>>>({ tools: true, guards: true });
  const [sort, setSort] = useState<ToolSort>('rate');
  const toggle = (k: BlockKey) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const st = stats.data;
  const runs = summary.data?.runs;
  const blocked = st?.guardrails.reduce((a, g) => a + g.blocked, 0) ?? 0;
  const checks = st?.guardrails.reduce((a, g) => a + g.checks, 0) ?? 0;

  return (
    <>
      <PageHeader title="집계" subtitle={runs === undefined ? undefined : `${runs}건 기준 · 도구 호출·가드레일·토큰·상태를 한눈에 봅니다`} />
      <PageMain>
        <KpiRow tiles={statTiles(summary.data)} />
        <FilterBar />
        {stats.isError ? (
          <Notice>집계를 불러오지 못했어요. {stats.error.message}</Notice>
        ) : !st ? (
          <Notice>불러오는 중…</Notice>
        ) : (
          <>
            <Collapsible title="도구 호출" sub={`${st.tool_kinds.reduce((a, k) => a + k.count, 0)}회 · 도구 ${TOOLS.length}개`} open={!!open.tools} onToggle={() => toggle('tools')} gap={24}>
              <ToolDonuts donuts={toolDonuts(st)} />
              <Segmented<ToolSort>
                label="정렬"
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'rate', label: '실패율 높은 순' },
                  { value: 'count', label: '호출 많은 순' },
                ]}
              />
              <ToolTable rows={toolRows(st, sort)} />
            </Collapsible>
            <Collapsible title="가드레일" sub={`검사 ${checks}회 · 차단 ${blocked}회`} open={!!open.guards} onToggle={() => toggle('guards')}>
              <GuardrailTable rows={guardRows(st.guardrails)} />
            </Collapsible>
            <Collapsible title="요청당 토큰 분포" open={!!open.kde} onToggle={() => toggle('kde')}>
              <TokenDensity kde={computeKde(st.token_samples)} />
            </Collapsible>
            <Collapsible title="상태 비율" open={!!open.status} onToggle={() => toggle('status')}>
              <RatioBar segs={statusSegs(st.statuses)} />
            </Collapsible>
            <Collapsible title="테스트 케이스별" sub={`${st.cases.length}개`} open={!!open.cases} onToggle={() => toggle('cases')} flush>
              <CaseTable rows={caseRows(st.cases)} selectedId={view.case ?? view.from} onOpen={view.openCase} />
            </Collapsible>
          </>
        )}
      </PageMain>
    </>
  );
}
