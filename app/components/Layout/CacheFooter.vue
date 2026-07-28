<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import { toast } from "vue-sonner";
import { footer } from "~/assets/json/static-text.json";
import type { ApodSource } from "#shared/types";

// Fixed cache-control bar. It makes the cache CHAIN tangible:
//   Vue Query (browser) -> Nitro (SWR) -> Redis (persistent) -> NASA (origin)
// The chain on the left shows each layer's full/empty state and highlights the
// active SERVER layer (the frontmost one still holding data). Each layer's button
// uses its natural operation: Vue Query INVALIDATES (revalidate → refetch from
// the server); Nitro and Redis CLEAR (empty the server cache). Clearing a server
// layer flips the badge to the next layer instantly.

// Last real fetch timing + source, written by useFetchApod.
const lastFetchMs = useState<number | null>("last-fetch-ms", () => null);
const lastFetchSource = useState<ApodSource>("last-fetch-source", () => "nasa");

const queryClient = useQueryClient();

// Live full/empty state of the server layers + the derived active server source.
const {
  status: serverStatus,
  refresh: refreshStatus,
  activeServerSource,
} = useCacheStatus();

// Client (Vue Query) layer: full when any apod query holds data.
const vueQueryFull = ref(false);
const syncVueQueryFull = () => {
  vueQueryFull.value = queryClient
    .getQueryCache()
    .findAll({ queryKey: ["apod"] })
    .some((query) => query.state.data !== undefined);
};

onMounted(() => {
  syncVueQueryFull();
  refreshStatus();
  const unsubscribe = queryClient.getQueryCache().subscribe(syncVueQueryFull);
  onUnmounted(unsubscribe);
});

// Fill {placeholders} in a static-text template with runtime values.
const fill = (template: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );

const timing = computed(() =>
  lastFetchMs.value !== null
    ? `${(lastFetchMs.value / 1000).toFixed(2)} s`
    : "",
);
const sourceLabel = computed(() => {
  const source = lastFetchSource.value;
  if (source === "redis") return "Redis";
  if (source === "nitro") return "Nitro";
  return "NASA";
});

// The active SERVER layer (frontmost full) — highlighted in the chain and shown
// by the page badge.
const activeLayer = computed<ApodSource>(() => activeServerSource.value);

// The chain, from client (front) to origin (back). NASA is the origin and is
// always available — it can't be emptied.
const chain = computed(() => [
  { key: "client", label: footer.vueQuery, full: vueQueryFull.value, dot: "bg-tanstack" },
  { key: "nitro", label: footer.nitro, full: serverStatus.value.nitro, dot: "bg-nitro" },
  { key: "redis", label: footer.redis, full: serverStatus.value.redis, dot: "bg-redis" },
  { key: "nasa", label: footer.nasa, full: true, dot: "bg-white/70" },
]);

// Layer 1 — Vue Query (client): INVALIDATE. Marks the client cache stale and
// refetches from the server chain, so you see which server layer answers + how
// fast. (This is TanStack's natural operation — not a plain "empty".)
const invalidateVueQuery = async () => {
  const active = queryClient
    .getQueryCache()
    .findAll({ queryKey: ["apod"], type: "active" });
  await queryClient.invalidateQueries({ queryKey: ["apod"] });
  await refreshStatus();
  if (active.length > 0) {
    toast.success(
      fill(footer.toastRevalidated, {
        source: sourceLabel.value,
        timing: timing.value ? ` in ${timing.value}` : "",
      }),
    );
  } else {
    toast.info(footer.toastNothingToRefetch);
  }
};

// CLEAR Layer 2 — Nitro (server SWR front).
const clearNitro = async () => {
  try {
    const data = await useClearNitroCache();
    if (data.status === 200) {
      await refreshStatus();
      toast.success(data.message);
    } else {
      toast.error(data.message);
    }
  } catch {
    toast.error(footer.toastClearFail);
  }
};

// CLEAR Layer 3 — Redis (server persistent backing store).
const clearRedis = async () => {
  try {
    const data = await useClearRedisCache();
    if (data.status === 200) {
      await refreshStatus();
      toast.success(data.message);
    } else {
      toast.error(data.message);
    }
  } catch {
    toast.error(footer.toastClearFail);
  }
};
</script>

<template>
  <footer
    class="fixed bottom-0 left-1/2 z-[60] w-full max-w-[1920px] -translate-x-1/2 border-t border-white/[0.08] bg-[rgba(7,7,9,0.74)] backdrop-blur-[18px] backdrop-saturate-[1.2]"
  >
    <div
      class="container mx-auto flex flex-col items-start gap-3 px-5 py-3.5 md:px-8 xl:h-16 xl:flex-row xl:items-center xl:gap-4 xl:py-0"
    >
      <!-- Left: the cache chain with live full/empty dots + active highlight -->
      <ClientOnly>
        <div class="flex flex-wrap items-center justify-start gap-x-2 gap-y-2">
          <div class="flex items-center gap-1">
            <template v-for="(node, i) in chain" :key="node.key">
              <span
                class="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors"
                :class="node.key === activeLayer ? 'bg-white/[0.06]' : ''"
              >
                <span
                  class="size-1.5 shrink-0 rounded-full transition-colors"
                  :class="node.full ? node.dot : 'bg-white/20'"
                />
                <span
                  class="whitespace-nowrap text-xs"
                  :class="node.key === activeLayer ? 'text-foreground' : 'text-text-dim'"
                >
                  {{ node.label }}
                </span>
              </span>
              <span v-if="i < chain.length - 1" class="text-text-dim/50">→</span>
            </template>
          </div>
          <span
            v-if="timing"
            class="whitespace-nowrap text-xs font-medium text-text-muted"
          >
            · {{ timing }}
          </span>
        </div>

        <template #fallback>
          <span class="text-sm text-text-muted">{{ footer.statusReady }}</span>
        </template>
      </ClientOnly>

      <!-- Right: two labelled groups — Invalidate (client) and Delete (server
           layers). Each group wraps as a unit, so on mobile they stack cleanly
           and stay labelled. -->
      <div
        class="flex flex-nowrap items-center justify-center gap-3 sm:gap-4 xl:ml-auto"
      >
        <!-- Invalidate group: Vue Query (client) — revalidate → refetch -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-text-dim">{{ footer.invalidateLabel }}</span>
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <button
                type="button"
                :aria-label="`${footer.invalidateLabel} ${footer.vueQuery}`"
                class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-tanstack-border bg-tanstack-tint px-3 py-2 text-sm font-medium text-text-strong transition-all hover:border-[rgba(56,189,248,0.5)] hover:bg-[rgba(56,189,248,0.14)] sm:px-4"
                @click="invalidateVueQuery"
              >
                <img src="/svg/marks/query.svg" alt="" width="24" height="24" class="h-4 w-auto">
                <span class="hidden sm:inline">{{ footer.vueQuery }}</span>
              </button>
            </UiTooltipTrigger>
            <UiTooltipContent class="z-[70] max-w-[260px]">{{ footer.vueQueryTitle }}</UiTooltipContent>
          </UiTooltip>
        </div>

        <!-- Delete group: Nitro + Redis (server caches) -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-text-dim">{{ footer.deleteLabel }}</span>
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <button
                type="button"
                :aria-label="`${footer.deleteLabel} ${footer.nitro}`"
                class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-nitro-border bg-nitro-tint px-3 py-2 text-sm font-medium text-nitro transition-all hover:border-[rgba(74,222,128,0.55)] hover:bg-[rgba(74,222,128,0.16)] sm:px-4"
                @click="clearNitro"
              >
                <img src="/svg/marks/nitro.svg" alt="" width="24" height="24" class="h-4 w-auto">
                <span class="hidden sm:inline">{{ footer.nitro }}</span>
              </button>
            </UiTooltipTrigger>
            <UiTooltipContent class="z-[70] max-w-[260px]">{{ footer.nitroTitle }}</UiTooltipContent>
          </UiTooltip>
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <button
                type="button"
                :aria-label="`${footer.deleteLabel} ${footer.redis}`"
                class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-redis-border bg-redis-tint px-3 py-2 text-sm font-medium text-[#f4b4b4] transition-all hover:border-[rgba(248,113,113,0.55)] hover:bg-[rgba(248,113,113,0.16)] sm:px-4"
                @click="clearRedis"
              >
                <img src="/svg/marks/redis.svg" alt="" width="24" height="24" class="h-4 w-auto">
                <span class="hidden sm:inline">{{ footer.redis }}</span>
              </button>
            </UiTooltipTrigger>
            <UiTooltipContent class="z-[70] max-w-[260px]">{{ footer.redisTitle }}</UiTooltipContent>
          </UiTooltip>
        </div>
      </div>
    </div>
  </footer>
</template>
