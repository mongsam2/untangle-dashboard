import { useSessions } from '../../api/queries';
import type { RunSource } from '../../api/types';
import { useViewState } from '../../app/useViewState';
import { Notice, PageHeader, PageMain } from '../../components/Page';
import { Segmented } from '../../components/Segmented';
import { useRunFilters } from '../runs/useRunFilters';
import { SessionTable } from './SessionTable';

// 세션 목록. 같은 session_id의 턴을 묶어 마지막 턴이 최근인 순서로 보여준다. 필터는 출처 하나다.
export function SessionsPage() {
  const { filters, setFilter } = useRunFilters();
  const view = useViewState();
  const sessions = useSessions(filters.source);
  const items = sessions.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader title="대화" />
      <PageMain>
        <Segmented<RunSource>
          label="출처"
          value={filters.source}
          onChange={(v) => setFilter('source', v)}
          options={[
            { value: 'all', label: '전체' },
            { value: 'test', label: '테스트' },
            { value: 'real', label: '실제 요청' },
          ]}
        />
        {sessions.isError ? (
          <Notice>대화 목록을 불러오지 못했어요. {sessions.error.message}</Notice>
        ) : sessions.isPending ? (
          <Notice>불러오는 중…</Notice>
        ) : (
          <SessionTable
            title={`대화 ${items.length}${sessions.hasNextPage ? '+' : ''}개`}
            items={items}
            selectedId={view.session}
            onOpen={view.openSession}
            hasMore={!!sessions.hasNextPage}
            loadingMore={sessions.isFetchingNextPage}
            onLoadMore={() => void sessions.fetchNextPage()}
          />
        )}
      </PageMain>
    </>
  );
}
