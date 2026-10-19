import { useState } from 'react';
import { useRunSummary, useStats } from '../../api/queries';
import { useViewState } from '../../app/useViewState';
import { Collapsible } from '../../components/Collapsible';
import { Notice, PageMain } from '../../components/Page';
import { Segmented } from '../../components/Segmented';
import { FilterBar } from '../runs/FilterPanel';
import { KpiHero } from '../runs/KpiHero';
import { useRunFilters } from '../runs/useRunFilters';
import { CaseTable } from './CaseTable';
import { computeKde } from './kde';
import { RatioBar } from './RatioBar';
import { caseRows, shareBlocks, statTiles, toolDonuts, toolRows, type ToolSort } from './statsModel';
import { TokenDensity } from './TokenDensity';
import { ToolDonuts } from './ToolDonuts';
import { ToolTable } from './ToolTable';

type BlockKey = 'tools' | 'kde' | 'share0' | 'share1' | 'cases';

export function StatsPage() {
  const { filters } = useRunFilters();
  const view = useViewState();
  const stats = useStats(filters);
  const summary = useRunSummary(filters);
  // 집계 블록은 처음에 모두 접혀 제목만 보인다.
  const [open, setOpen] = useState<Partial<Record<BlockKey, boolean>>>({});
  const [sort, setSort] = useState<ToolSort>('rate');
  const toggle = (k: BlockKey) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const st = stats.data;

  return (
    <>
      <KpiHero tiles={statTiles(summary.data)} />
      <PageMain>
        <FilterBar />
        {stats.isError ? (
          <div className="card">
            <Notice>집계를 불러오지 못했어요. {stats.error.message}</Notice>
          </div>
        ) : !st ? (
          <div className="card">
            <Notice>불러오는 중…</Notice>
          </div>
        ) : (
          <>
            <Collapsible title="도구 호출" open={!!open.tools} onToggle={() => toggle('tools')} gap={24}>
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
            <Collapsible title="요청당 토큰 분포" open={!!open.kde} onToggle={() => toggle('kde')}>
              <TokenDensity kde={computeKde(st.token_samples)} />
            </Collapsible>
            {shareBlocks(st).map((g, i) => {
              const key = ('share' + i) as BlockKey;
              return (
                <Collapsible key={g.title} title={g.title} open={!!open[key]} onToggle={() => toggle(key)}>
                  <RatioBar segs={g.segs} />
                </Collapsible>
              );
            })}
            <Collapsible title="테스트 케이스별" open={!!open.cases} onToggle={() => toggle('cases')} flush>
              <CaseTable rows={caseRows(st.cases)} selectedId={view.case ?? view.from} onOpen={view.openCase} />
            </Collapsible>
          </>
        )}
      </PageMain>
    </>
  );
}
