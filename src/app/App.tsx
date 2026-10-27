import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { ApiError } from '../api/errors';
import { ConnectionProvider } from './connection';
import { router } from './routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // 4xx는 다시 보내도 같다. 백엔드는 틀린 운영자 키를 세어 잠시 막으므로 404를 되풀이하지 않는다.
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider>
        <RouterProvider router={router} />
      </ConnectionProvider>
    </QueryClientProvider>
  );
}
