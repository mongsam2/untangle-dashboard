import { useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { apiMode } from '../api/client';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { CaseInspector } from '../features/cases/CaseInspector';
import { ReplayPlayer } from '../features/replay/ReplayPlayer';
import { SessionReplayPlayer } from '../features/replay/SessionReplayPlayer';
import { RunInspector } from '../features/run-detail/RunInspector';
import { SessionInspector } from '../features/sessions/SessionInspector';
import s from './AppShell.module.css';
import { useViewState } from './useViewState';
import { filtersOnly } from './viewParams';

export interface ShellContext {
  filtersOpen: boolean;
  toggleFilters: () => void;
}

const NAV = [
  { path: '/runs', label: '요청 목록' },
  { path: '/sessions', label: '대화' },
  { path: '/stats', label: '집계' },
];

// 흰 전역 메뉴, 본문, 오른쪽 상세 패널.
export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const view = useViewState();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const current = NAV.find((n) => location.pathname.startsWith(n.path)) ?? NAV[0]!;

  const go = (path: string) => {
    const q = filtersOnly(params).toString();
    navigate(path + (q ? '?' + q : ''));
  };

  return (
    <div className={s.root}>
      <header className={s.nav}>
        <nav aria-label="대시보드 메뉴" className={s.navInner}>
          <span className={s.brand}>Tangle AI</span>
          {NAV.map((n) => {
            const cur = n === current;
            return (
              <button key={n.path} type="button" className={`${s.navLink} ${cur ? s.navCurrent : ''}`} aria-current={cur ? 'page' : undefined} onClick={() => go(n.path)}>
                {n.label}
              </button>
            );
          })}
          {apiMode === 'mock' && <span className={s.mode}>예시 데이터</span>}
        </nav>
      </header>
      <div className={s.body}>
        <div className={s.content}>
          <ErrorBoundary key={location.pathname + location.search}>
            <Outlet context={{ filtersOpen, toggleFilters: () => setFiltersOpen((v) => !v) } satisfies ShellContext} />
          </ErrorBoundary>
        </div>
        {view.run ? (
          <ErrorBoundary key={view.run}>
            <RunInspector runId={view.run} fromCase={view.from} fromSession={view.session} />
          </ErrorBoundary>
        ) : view.session ? (
          <ErrorBoundary key={view.session}>
            <SessionInspector sessionId={view.session} />
          </ErrorBoundary>
        ) : view.case ? (
          <ErrorBoundary key={view.case}>
            <CaseInspector caseId={view.case} />
          </ErrorBoundary>
        ) : null}
      </div>
      {view.run && view.replay ? (
        <ErrorBoundary key={view.run}>
          <ReplayPlayer runId={view.run} onClose={view.closeReplay} />
        </ErrorBoundary>
      ) : view.session && view.replay ? (
        <ErrorBoundary key={view.session}>
          <SessionReplayPlayer sessionId={view.session} onClose={view.closeReplay} />
        </ErrorBoundary>
      ) : null}
    </div>
  );
}
