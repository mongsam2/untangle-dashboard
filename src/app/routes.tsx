import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RunsPage } from '../features/runs/RunsPage';
import { SessionsPage } from '../features/sessions/SessionsPage';
import { StatsPage } from '../features/stats/StatsPage';
import { AppShell } from './AppShell';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/runs', element: <RunsPage /> },
      { path: '/sessions', element: <SessionsPage /> },
      { path: '/stats', element: <StatsPage /> },
      // 이전 주소를 새 이름으로 넘긴다.
      { path: '/conversations', element: <Navigate to="/sessions" replace /> },
      { path: '*', element: <Navigate to="/runs" replace /> },
    ],
  },
]);
