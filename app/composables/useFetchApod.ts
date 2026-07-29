import type { QueryObserverResult } from "@tanstack/vue-query";
import { useQuery } from "@tanstack/vue-query";
import { experimental_createQueryPersister } from "@tanstack/query-persist-client-core";
import type { ApodList, ApodSource } from "#shared/types";

/**
 * Fetch NASA APOD data through the internal cached endpoint.
 *
 * Without a `date` it returns the list (`ApodList`); with a `date` it returns a
 * single entry (`ApodEntry`). Pass the expected shape as the type parameter.
 *
 * Also exposes the cache layers for the UI badges:
 * - `serverSource`: which server layer is currently the active source, the
 *   frontmost one still holding data (Nitro -> Redis -> NASA). Flips instantly
 *   when a layer is cleared, so the badge always reflects live cache state.
 * - `fromClientCache`: true when Vue Query holds this data on the client.
 */
export default async function useFetchApod<T = ApodList>(
  date?: string,
): Promise<{
  isLoading: Ref<boolean>;
  isPending: Ref<boolean>;
  isFetching: Ref<boolean>;
  isSuccess: Ref<boolean>;
  data: Ref<T | undefined>;
  serverSource: Ref<ApodSource>;
  fromClientCache: Ref<boolean>;
  refetch: () => Promise<QueryObserverResult<T, Error>>;
}> {
  const url = date ? `/api/apod?date=${date}` : "/api/apod";

  // Live cache state → the currently active server layer (drives the badges).
  const { activeServerSource, refresh: refreshCacheStatus } = useCacheStatus();

  // Duration of the last real fetch (ms), a warm cache layer is far faster than
  // a fresh NASA round-trip, which makes the cache benefit visible.
  const lastFetchMs = useState<number | null>("last-fetch-ms", () => null);
  // Which chain layer actually served the last real fetch (for the invalidate
  // toast: "revalidated, served from Redis in 0.01 s").
  const lastFetchSource = useState<ApodSource>("last-fetch-source", () => "nasa");

  const fetchApod = async (): Promise<T> => {
    const start = performance.now();
    try {
      // Cast around the typed-route overloads: `url` is a dynamic string, which
      // makes the typed $fetch recurse ("excessive stack depth").
      const result = await ($fetch as (u: string) => Promise<T>)(url);
      lastFetchMs.value = Math.round(performance.now() - start);
      lastFetchSource.value = (result as { _source?: ApodSource })?._source ?? "nasa";
      // The fetch re-warms the layers it passed through, refresh the live state.
      if (import.meta.client) refreshCacheStatus();
      return result;
    } catch (error) {
      // Preserve the real upstream status (fetchFromNasa already forwards
      // 404/429/502/…) instead of masking everything as "Not Found".
      const statusCode =
        (error as { statusCode?: number; status?: number }).statusCode ??
        (error as { status?: number }).status ??
        500;
      throw createError({
        statusCode,
        message: (error as Error).message,
        fatal: true,
      });
    }
  };

  const {
    data,
    suspense,
    isLoading,
    isPending,
    isFetching,
    isSuccess,
    refetch,
  } = useQuery<T, Error, T>({
    queryKey: date ? ["apod", date] : ["apod"],
    queryFn: fetchApod,
    // Persist to localStorage on the client for instant repeat visits.
    ...(import.meta.client && {
      persister: experimental_createQueryPersister({ storage: localStorage })
        .persisterFn,
    }),
  });

  await suspense();

  // The active server layer for the badges: the frontmost server cache still
  // holding data. Clearing a layer flips this instantly (via the live cache
  // status), so the badge reflects "who would serve the next request".
  const serverSource = activeServerSource;

  // Whether the client Vue Query cache currently holds this data. Hidden while a
  // fetch is in flight (the loader shows the source then), and shown again once
  // the refetch has repopulated the cache.
  const fromClientCache = computed(() => !isFetching.value && !!data.value);

  return {
    isLoading,
    isPending,
    isFetching,
    isSuccess,
    data,
    serverSource,
    fromClientCache,
    refetch,
  };
}
