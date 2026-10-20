import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ConversationsPage } from '../features/conversations/ConversationsPage';
import { RunsPage } from '../features/runs/RunsPage';
import { StatsPage } from '../features/stats/StatsPage';
import { AppShell } from './AppShell';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/runs', element: <RunsPage /> },
      { path: '/conversations', element: <ConversationsPage /> },
      { path: '/stats', element: <StatsPage /> },
      { path: '*', element: <Navigate to="/runs" replace /> },
    ],
  },
]);
