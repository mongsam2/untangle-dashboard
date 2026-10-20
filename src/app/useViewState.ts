import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  backToCaseParams,
  backToConversationParams,
  closeParams,
  openCaseParams,
  openConversationParams,
  openRunParams,
  openTurnParams,
  readView,
  replayParams,
} from './viewParams';

export function useViewState() {
  const [params, setParams] = useSearchParams();
  const view = useMemo(() => readView(params), [params]);
  const set = useCallback(
    (fn: (p: URLSearchParams) => URLSearchParams, replace = false) => setParams((p) => fn(p), { replace }),
    [setParams],
  );
  return {
    ...view,
    openRun: (id: string, fromCase?: string | null) => set((p) => openRunParams(p, id, fromCase)),
    openCase: (id: string) => set((p) => openCaseParams(p, id)),
    openConversation: (id: string) => set((p) => openConversationParams(p, id)),
    openTurn: (conversationId: string, runId: string) => set((p) => openTurnParams(p, conversationId, runId)),
    backToConversation: () => set(backToConversationParams),
    close: () => set(closeParams),
    backToCase: () => set(backToCaseParams),
    openReplay: () => set((p) => replayParams(p, true)),
    closeReplay: () => set((p) => replayParams(p, false), true),
  };
}
