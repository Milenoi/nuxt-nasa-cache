import type { ApodSource } from "#shared/types";

interface ServerCacheStatus {
  redis: boolean;
  nitro: boolean;
  redisCount: number;
  nitroCount: number;
}

/**
 * Live full/empty state of the server cache layers (Nitro + Redis), shared across
 * the app via a single keyed request. `activeServerSource` derives which server
 * layer would serve the NEXT request, the frontmost layer that still holds data
 * (Nitro, else Redis, else NASA). Clearing a layer flips it instantly.
 *
 * Call `refresh()` after a clear (or a fetch) to update everything.
 */
export default function useCacheStatus() {
  const { data, refresh } = useAsyncData<ServerCacheStatus>(
    "cache-status",
    // Cast around the typed-route overloads (they recurse: "excessive stack depth").
    () => ($fetch as (u: string) => Promise<ServerCacheStatus>)("/api/cache-status"),
    {
      default: () => ({
        redis: false,
        nitro: false,
        redisCount: 0,
        nitroCount: 0,
      }),
    },
  );

  const activeServerSource = computed<ApodSource>(() =>
    data.value.nitro ? "nitro" : data.value.redis ? "redis" : "nasa",
  );

  return { status: data, refresh, activeServerSource };
}
