import { QueryClient } from "@tanstack/react-query";

export const QUERY_TIMINGS = {
  // Stable metrics: cache for 15s before stale
  METRICS_STALE_MS: 15 * 1000,
  // Infrastructure telemetry: cache for 10s before stale
  INFRA_STALE_MS: 10 * 1000,
  // Directory listings: cache for 30s
  DIRECTORY_STALE_MS: 30 * 1000,
  // Ledger and custody records: cache for 30s
  RECORDS_STALE_MS: 30 * 1000,
  // Merchant details: cache for 45s
  DETAIL_STALE_MS: 45 * 1000,
  // Cache retention garbage collection: 5 minutes
  GC_TIME_MS: 5 * 60 * 1000,
} as const;

export function createAdminQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_TIMINGS.METRICS_STALE_MS,
        gcTime: QUERY_TIMINGS.GC_TIME_MS,
        refetchOnWindowFocus: false,
        retry: 2,
      },
    },
  });
}
