import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // 1 retry with backoff
      refetchOnWindowFocus: true,
      staleTime: 60 * 1000, // 1 min default
    },
  },
});
