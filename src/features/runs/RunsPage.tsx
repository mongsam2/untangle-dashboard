import { useRuns } from '../../api/queries';
import { useViewState } from '../../app/useViewState';
import { KpiRow, Notice, PageHeader, PageMain } from '../../components/Page';
import { FilterBar } from './FilterBar';
import { listTiles } from './kpi';
import { RunTable } from './RunTable';
import { useRunFilters } from './useRunFilters';

export function RunsPage() {
  const { filters } = useRunFilters();
  const view = useViewState();
  const runs = useRuns(filters);
  const summary = runs.data?.pages[0]?.summary;
  const items = runs.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader title="요청 목록" />
      <PageMain>
        <KpiRow tiles={listTiles(summary)} />
        <FilterBar showLegend />
        {runs.isError ? (
          <Notice>요청 목록을 불러오지 못했어요. {runs.error.message}</Notice>
        ) : runs.isPending ? (
          <Notice>불러오는 중…</Notice>
        ) : (
          <RunTable
            title={`요청 ${summary?.runs ?? items.length}건`}
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
