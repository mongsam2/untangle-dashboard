import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  backToCaseParams,
  backToSessionParams,
  closeParams,
  openCaseParams,
  openRunParams,
  openSessionParams,
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
    openSession: (id: string) => set((p) => openSessionParams(p, id)),
    openTurn: (sessionId: string, runId: string) => set((p) => openTurnParams(p, sessionId, runId)),
    backToSession: () => set(backToSessionParams),
    close: () => set(closeParams),
    backToCase: () => set(backToCaseParams),
    openReplay: () => set((p) => replayParams(p, true)),
    closeReplay: () => set((p) => replayParams(p, false), true),
  };
}
