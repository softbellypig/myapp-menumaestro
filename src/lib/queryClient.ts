import { QueryClient } from "@tanstack/react-query";

// In Tauri, we don't use fetch-based queries — all data comes through invoke.
// This queryClient is kept for cache management and mutation coordination.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
