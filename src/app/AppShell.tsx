import { useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CaseInspector } from '../features/cases/CaseInspector';
import { ReplayPlayer } from '../features/replay/ReplayPlayer';
import { RunInspector } from '../features/run-detail/RunInspector';
import s from './AppShell.module.css';
import { useViewState } from './useViewState';
import { filtersOnly } from './viewParams';

export interface ShellContext {
  filtersOpen: boolean;
  toggleFilters: () => void;
}

const NAV = [
  { path: '/runs', label: '요청 목록' },
  { path: '/stats', label: '집계' },
];

// 검은 전역 메뉴, 반투명 하위 메뉴, 본문과 오른쪽 상세 패널.
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
        </nav>
      </header>
      <div className={s.subnav}>
        <div className={s.subnavInner}>
          <span className={s.pageTitle}>{current.label}</span>
        </div>
      </div>
      <div className={s.body}>
        <div className={s.content}>
          <Outlet context={{ filtersOpen, toggleFilters: () => setFiltersOpen((v) => !v) } satisfies ShellContext} />
        </div>
        {view.run ? (
          <RunInspector key={view.run} runId={view.run} fromCase={view.from} />
        ) : view.case ? (
          <CaseInspector key={view.case} caseId={view.case} />
        ) : null}
      </div>
      {view.run && view.replay && <ReplayPlayer runId={view.run} onClose={view.closeReplay} />}
    </div>
  );
}
