<script setup lang="ts">
import { useIsFetching } from "@tanstack/vue-query";

// Copy comes from the shared content via the cache chain.
const { content } = useSiteContent();

// Full-screen "Fetching from Redis/NASA" overlay stays a signature feature.
const isFetching = useIsFetching();
</script>

<template>
  <UiTooltipProvider :delay-duration="200">
    <div class="mx-auto min-h-[100dvh] max-w-[1920px] bg-background text-foreground">
      <a
        href="#main"
        class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:border focus:border-white/20 focus:bg-surface-panel focus:px-4 focus:py-2 focus:text-sm focus:text-foreground"
      >
        {{ content?.common.skipToContent }}
      </a>
      <LayoutSiteHeader />

      <Transition
        enter-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150"
        leave-to-class="opacity-0"
      >
        <LayoutLoadingLayer v-if="isFetching" />
      </Transition>

      <main id="main">
        <slot />
      </main>

      <LayoutCacheFooter />
      <LayoutScrollToTop />

      <UiToaster position="top-center" :duration="4000" theme="dark" rich-colors />
    </div>
  </UiTooltipProvider>
</template>
