import { useRuns, useStats } from '../../api/queries';
import { Notice, PageMain } from '../../components/Page';
import { useViewState } from '../../app/useViewState';
import { FilterBar } from './FilterPanel';
import { KpiHero } from './KpiHero';
import { listTiles } from './kpi';
import { RunTable } from './RunTable';
import { useRunFilters } from './useRunFilters';

export function RunsPage() {
  const { filters } = useRunFilters();
  const view = useViewState();
  const runs = useRuns(filters);
  const stats = useStats(filters);
  const summary = runs.data?.pages[0]?.summary;
  const items = runs.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <KpiHero tiles={listTiles(summary, stats.data)} />
      <PageMain>
        <FilterBar showLegend />
        {runs.isError ? (
          <div className="card">
            <Notice>요청 목록을 불러오지 못했어요. {runs.error.message}</Notice>
          </div>
        ) : runs.isPending ? (
          <div className="card">
            <Notice>불러오는 중…</Notice>
          </div>
        ) : (
          <RunTable
            total={summary?.runs ?? items.length}
            items={items}
            selectedId={view.run}
            onOpen={(id) => view.openRun(id)}
            hasMore={!!runs.hasNextPage}
            loadingMore={runs.isFetchingNextPage}
            onLoadMore={() => void runs.fetchNextPage()}
          />
        )}
      </PageMain>
    </>
  );
}
