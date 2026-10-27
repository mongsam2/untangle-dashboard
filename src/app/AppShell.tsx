import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { apiMode } from '../api/client';
import { SERVER_LABELS, type ServerId } from '../api/servers';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { CaseInspector } from '../features/cases/CaseInspector';
import { ReplayPlayer } from '../features/replay/ReplayPlayer';
import { SessionReplayPlayer } from '../features/replay/SessionReplayPlayer';
import { RunInspector } from '../features/run-detail/RunInspector';
import { SessionInspector } from '../features/sessions/SessionInspector';
import s from './AppShell.module.css';
import { useConnection, useServer } from './connection';
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
  const connection = useConnection();
  const server = useServer();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const current = NAV.find((n) => location.pathname.startsWith(n.path)) ?? NAV[0]!;

  const go = (path: string) => {
    const q = filtersOnly(params).toString();
    navigate(path + (q ? '?' + q : ''));
  };

  // 열어 둔 실행·대화는 다른 서버에 없으므로 서버를 바꾸면 상세 패널을 닫고 목록만 남긴다.
  // 서버는 주소에 남겨, 링크를 받은 사람과 뒤로 가기가 같은 서버의 기록을 보게 한다.
  const switchServer = (id: ServerId) => {
    if (id === server) return;
    connection.remember(id);
    const q = filtersOnly(params);
    q.set('server', id);
    navigate(current.path + '?' + q.toString());
  };

  // 주소에 서버가 없거나 연결되지 않은 서버면 지금 보는 서버로 고쳐 적는다.
  const linked = params.get('server');
  useEffect(() => {
    if (!server || linked === server) return;
    const q = new URLSearchParams(params);
    q.set('server', server);
    navigate(location.pathname + '?' + q.toString(), { replace: true });
  }, [linked, server, params, location.pathname, navigate]);

  return (
    <div className={s.root}>
      <header className={`${s.nav} ${server === 'prod' ? s.navProd : ''}`}>
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
          {apiMode === 'mock' ? (
            <span className={s.mode}>예시 데이터</span>
          ) : (
            <div className={s.servers}>
              {connection.servers.length > 1 ? (
                <div className={s.serverGroup} role="group" aria-label="서버">
                  {connection.servers.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={s.serverButton}
                      data-server={id}
                      aria-pressed={id === server}
                      onClick={() => switchServer(id)}
                    >
                      {SERVER_LABELS[id]} 서버
                    </button>
                  ))}
                </div>
              ) : (
                server && (
                  <span className={s.serverName} data-server={server}>
                    {SERVER_LABELS[server]} 서버
                  </span>
                )
              )}
              {connection.lock && (
                <button type="button" className={s.lock} onClick={connection.lock}>
                  잠그기
                </button>
              )}
            </div>
          )}
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
