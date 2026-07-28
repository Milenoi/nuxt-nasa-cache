<script lang="ts" setup>
// Copy comes from the shared content via the cache chain.
const { content } = useSiteContent();

// While fetching we hint at the source: the active server layer (the frontmost
// one still holding data) is what a request falls through to.
const { activeServerSource } = useCacheStatus();

const prediction = computed(() => {
  if (activeServerSource.value === "nitro") {
    return { label: "Nitro", mark: "/svg/marks/nitro.svg", cls: "text-nitro" };
  }
  if (activeServerSource.value === "redis") {
    return { label: "Redis", mark: "/svg/marks/redis.svg", cls: "text-redis" };
  }
  return { label: "NASA", mark: "/svg/marks/nasa.svg", cls: "text-nasa" };
});
</script>

<template>
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-loading-overlay backdrop-blur-[6px]"
  >
    <div class="flex flex-col items-center gap-7">
      <!-- Orbital system: glowing core + two satellites + twinkling stars -->
      <div class="relative h-28 w-28">
        <span class="absolute left-2 top-5 h-0.5 w-0.5 rounded-full bg-white [animation:twinkle_1.8s_ease-in-out_infinite]" />
        <span class="absolute right-4 top-2 h-0.5 w-0.5 rounded-full bg-white [animation:twinkle_2.4s_ease-in-out_infinite]" />
        <span class="absolute bottom-3 left-7 h-0.5 w-0.5 rounded-full bg-white [animation:twinkle_2s_ease-in-out_infinite]" />
        <span class="absolute bottom-6 right-5 h-1 w-1 rounded-full bg-white [animation:twinkle_1.5s_ease-in-out_infinite]" />

        <!-- outer orbit (white satellite) -->
        <div class="absolute inset-0 rounded-full border border-white/10 [animation:orbit_4s_linear_infinite]">
          <span class="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_#fff]" />
        </div>
        <!-- inner orbit (blue satellite, reversed) -->
        <div class="absolute inset-[18px] rounded-full border border-white/6 [animation:orbit_2.6s_linear_infinite_reverse]">
          <span class="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-tanstack shadow-[0_0_8px_#38bdf8]" />
        </div>
        <!-- glowing core -->
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div class="h-4 w-4 rounded-full bg-[radial-gradient(circle,#e0f2fe_0%,#38bdf8_70%)] shadow-[0_0_22px_#38bdf8] [animation:corepulse_2s_ease-in-out_infinite]" />
        </div>
      </div>

      <span
        role="status"
        aria-live="polite"
        class="inline-flex items-center gap-2 text-sm text-text-secondary"
      >
        {{ content?.common.isFetchingFromLabel }}
        <span :class="prediction.cls" class="font-medium">
          {{ prediction.label }}
        </span>
        <img
          :src="prediction.mark"
          :width="getMarkSize(prediction.mark).width"
          :height="getMarkSize(prediction.mark).height"
          :alt="prediction.label"
          class="h-[15px] w-auto"
        >
      </span>
    </div>
  </div>
</template>
