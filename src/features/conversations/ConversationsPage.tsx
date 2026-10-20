import { useConversations } from '../../api/queries';
import type { RunSource } from '../../api/types';
import { useViewState } from '../../app/useViewState';
import { Notice, PageMain } from '../../components/Page';
import { Segmented } from '../../components/Segmented';
import { useRunFilters } from '../runs/useRunFilters';
import { ConversationTable } from './ConversationTable';

// 대화 목록. 같은 대화의 요청을 묶어 보고, 행을 누르면 요청이 쌓인 대화 인스펙터가 열린다.
export function ConversationsPage() {
  const { filters, setFilter } = useRunFilters();
  const view = useViewState();
  const list = useConversations(filters.source);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <PageMain>
      <Segmented<RunSource>
        label="요청 출처"
        value={filters.source}
        onChange={(v) => setFilter('source', v)}
        options={[
          { value: 'all', label: '전체' },
          { value: 'test', label: '테스트' },
          { value: 'real', label: '실제 요청' },
        ]}
      />
      {list.isError ? (
        <div className="card">
          <Notice>대화 목록을 불러오지 못했어요. {list.error.message}</Notice>
        </div>
      ) : list.isPending ? (
        <div className="card">
          <Notice>불러오는 중…</Notice>
        </div>
      ) : (
        <ConversationTable
          items={items}
          selectedId={view.conversation}
          onOpen={(id) => view.openConversation(id)}
          hasMore={!!list.hasNextPage}
          loadingMore={list.isFetchingNextPage}
          onLoadMore={() => void list.fetchNextPage()}
        />
      )}
    </PageMain>
  );
}
