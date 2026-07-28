<script setup lang="ts">
import type { ContentSource } from "#shared/types";

useSeoMeta({
  title: "About - Nuxt Cache",
  description:
    "A small Nuxt 4 side project about multi-layer caching over NASA's Astronomy Picture of the Day API.",
  ogTitle: "About — Nuxt Cache",
  ogDescription:
    "Why and how Nuxt Cache layers Redis and TanStack Vue Query over a slow, rate-limited NASA API.",
  twitterTitle: "About — Nuxt Cache",
  twitterDescription:
    "Why and how Nuxt Cache layers Redis and TanStack Vue Query over a slow, rate-limited NASA API.",
});

// The copy on this page rides the same cache chain as the APOD data: it comes
// through the internal /api/content endpoint (Vue Query -> Nitro -> Redis -> JSON)
// instead of being imported at build time.
const { data: content, serverSource } = await useContent();
const about = computed(() => content.value?.about);

const githubUrl = "https://github.com/Milenoi/nuxt-cache";

// Human-readable label for the layer that served this content (the same
// cache-source idea as the APOD badges, kept lightweight here).
const sourceLabel: Record<ContentSource, string> = {
  origin: "the bundled JSON",
  redis: "Redis",
  nitro: "Nitro (SWR)",
};
</script>

<template>
  <section
    class="container mx-auto min-h-screen px-5 pb-40 pt-32 md:px-8 [animation:fadeUp_0.4s_ease]"
  >
    <div v-if="about" class="text-left md:text-center">
      <div class="mb-3 text-[15px] font-medium tracking-[0.01em] text-text-muted">
        {{ about.tagline }}
      </div>
      <h1
        class="m-0 mb-6 text-balance font-serif text-[clamp(40px,5.5vw,64px)] font-normal leading-[1.05] tracking-tight md:mx-auto md:max-w-[15ch]"
      >
        {{ about.heading }}
      </h1>

      <p class="mb-5 max-w-[56ch] text-base leading-relaxed text-text-body md:mx-auto">
        {{ about.lead1 }}
      </p>
      <p class="max-w-[56ch] text-[15px] leading-relaxed text-text-secondary md:mx-auto">
        {{ about.lead2 }}
      </p>

      <div class="mb-1 mt-14 text-xs uppercase tracking-[0.14em] text-text-faint">
        {{ about.techStackLabel }}
      </div>
      <dl class="max-w-xl border-t border-white/[0.08] text-left md:mx-auto">
        <div
          v-for="row in about.techStack"
          :key="row.label"
          class="flex justify-between gap-4 border-b border-white/[0.07] py-4"
        >
          <dt class="text-sm text-text-muted">{{ row.label }}</dt>
          <dd class="m-0 text-right text-[14.5px] text-text-strong">
            {{ row.value }}
          </dd>
        </div>
      </dl>

      <div>
        <a
          :href="githubUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-10 inline-flex items-center gap-2 rounded-lg border border-white/[0.16] bg-white/[0.03] px-5 py-3 text-sm font-medium transition-colors hover:border-white/30 hover:bg-white/[0.09]"
        >
          {{ about.cta }}
        </a>
      </div>

      <p class="mt-10 max-w-[56ch] text-sm leading-relaxed text-text-muted md:mx-auto">
        {{ about.creditText }} {{ about.creditSep }}
        <a
          :href="about.creditUrl"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="viridis.de (opens in a new tab)"
          class="text-text-strong underline decoration-white/20 underline-offset-4 transition-colors hover:text-foreground hover:decoration-white/50"
        >
          {{ about.creditLinkLabel }}
        </a>
      </p>

      <p class="mt-3 max-w-[56ch] text-sm leading-relaxed text-text-muted md:mx-auto">
        {{ about.siblingText }}
        <a
          :href="about.siblingUrl"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="RAG demo (opens in a new tab)"
          class="text-text-strong underline decoration-white/20 underline-offset-4 transition-colors hover:text-foreground hover:decoration-white/50"
        >
          {{ about.siblingLinkLabel }}
        </a>
        {{ about.siblingSuffix }}
      </p>

      <p class="mt-8 text-xs text-text-faint">
        This page's copy was served from {{ sourceLabel[serverSource] }}.
      </p>
    </div>
  </section>
</template>
