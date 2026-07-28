<script setup lang="ts">
import type { ApodSource } from "#shared/types";

const { content } = useSiteContent();

// Every gallery item flows through both caches, so we show the client (Vue Query)
// mark next to the live server source (Redis, or NASA once the cache is cleared).
const props = defineProps<{ serverSource: ApodSource }>();

// Forward positioning classes (e.g. `absolute left-3 top-3`) to the trigger span.
defineOptions({ inheritAttrs: false });

const serverMark = computed(() => {
  if (props.serverSource === "nitro") return "/svg/marks/nitro.svg";
  if (props.serverSource === "redis") return "/svg/marks/redis.svg";
  return "/svg/marks/nasa.svg";
});
</script>

<template>
  <UiTooltip>
    <UiTooltipTrigger as-child>
      <span
        v-bind="$attrs"
        class="inline-flex items-center gap-3 rounded-full border border-white/12 bg-badge-bg px-3.5 py-2 backdrop-blur-sm"
      >
        <img src="/svg/marks/query.svg" alt="" width="24" height="24" class="h-5 w-auto">
        <span class="h-5 w-px bg-white/18" />
        <img
          :src="serverMark"
          :width="getMarkSize(serverMark).width"
          :height="getMarkSize(serverMark).height"
          alt=""
          class="h-5 w-auto"
        >
      </span>
    </UiTooltipTrigger>
    <UiTooltipContent>{{ content?.apod.all.bothCaches }}</UiTooltipContent>
  </UiTooltip>
</template>
