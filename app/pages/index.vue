<script setup lang="ts">
import {ArrowRight} from "@lucide/vue";
import type {ApodList} from "#shared/types";

// Hero copy + SEO come from the shared content via the cache chain.
const {content} = useSiteContent();
const hero = computed(() => content.value?.hero);
const seo = computed(() => content.value?.seo?.home);

// SEO from the content (twitter:* fall back to og:* set globally in app.vue).
useSeoMeta({
    title: () => seo.value?.title,
    description: () => seo.value?.description,
    ogTitle: () => seo.value?.title,
    ogDescription: () => seo.value?.description,
});

// Pull the latest APOD so the hero itself is delivered through Redis + TanStack.
const {data, serverSource, fromClientCache} = await useFetchApod<ApodList>();

// Newest APOD, any media type — the hero reflects today's actual entry.
const latestApod = computed(() => data.value?.entries?.[0] ?? null);

// The ambient background media (video / embed / image) + poster + reduced-motion
// autoplay handler live in useApodHero, so this page stays about layout.
const {heroVideo, heroImage, heroVideoPoster, heroIframe, onHeroLoaded}
    = useApodHero(latestApod);

// Two cache layers, both shown when true (mirrors the old ApiLogo + gallery
// cards): the client cache (Vue Query) and the server source (Redis warm / NASA
// cold or just-cleared). serverSource already flips to "nasa" after a Redis clear.
const clientPill = computed(() => ({
    label: hero.value?.client,
    layer: hero.value?.clientLayer,
    mark: "/svg/marks/query.svg",
    cls: "bg-tanstack-pill border-tanstack-pill-border text-tanstack-pill-text",
}));

const serverPill = computed(() => {
    if (serverSource.value === "nitro") {
        return {
            label: hero.value?.serverNitro,
            layer: hero.value?.serverNitroLayer,
            mark: "/svg/marks/nitro.svg",
            cls: "bg-nitro-pill border-nitro-pill-border text-nitro-pill-text",
        };
    }
    if (serverSource.value === "redis") {
        return {
            label: hero.value?.serverRedis,
            layer: hero.value?.serverRedisLayer,
            mark: "/svg/marks/redis.svg",
            cls: "bg-redis-pill border-redis-pill-border text-redis-pill-text",
        };
    }
    return {
        label: hero.value?.serverNasa,
        layer: hero.value?.serverNasaLayer,
        mark: "/svg/marks/nasa.svg",
        cls: "bg-nasa-pill border-nasa-pill-border text-nasa-pill-text",
    };
});
</script>

<template>
  <section class="group relative h-dvh min-h-150 overflow-hidden">
    <!-- Background: newest APOD. A direct video file or a YouTube/Vimeo embed
         plays muted+looping; otherwise a single responsive AVIF image. The
         wrapper does a one-off fade + zoom-in on mount; the inner image keeps
         its endless ambient slowzoom. The two live on separate elements on
         purpose: both animate transform: scale, and two scale animations on the
         same element would overwrite each other. Splitting them lets the entry
         zoom and the ambient drift compose instead of clash. -->
    <div class="absolute inset-0 overflow-hidden animate-[heroZoomIn_0.9s_ease-out]">
      <video
          v-if="heroVideo"
          :src="heroVideo"
          muted
          loop
          playsinline
          preload="auto"
          :poster="heroVideoPoster"
          aria-hidden="true"
          tabindex="-1"
          class="h-full w-full bg-[radial-gradient(circle_at_50%_35%,#1b1b22,#0b0b0e)] object-cover"
          @loadedmetadata="onHeroLoaded"
      />
      <iframe
          v-else-if="heroIframe"
          :src="heroIframe"
          class="pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2"
          allow="autoplay; encrypted-media; picture-in-picture"
          title=""
          aria-hidden="true"
          tabindex="-1"
      />
        <!-- Explicit per-breakpoint px sizes, not "100vw": a bare vw value does not
             resolve against the screens config here and collapses the srcset to a
             useless 1w/2w ladder, so every device downloads the full image. Listed
             widths give a real responsive ladder (a phone pulls ~960w, desktop
             1920w). No width/height/fit: the hero fills a fixed-height, absolutely
             positioned stage, so CSS object-cover handles crop and there is no CLS
             to reserve against. quality 60 — it sits behind a gradient and text and
             slow-zooms, so the extra bytes of q80 buy no visible fidelity. -->
      <NuxtImg
          v-else
          :src="heroImage"
          :alt="latestApod?.title ?? hero?.tagline"
          sizes="xs:600px sm:960px md:1280px lg:1600px xl:1920px"
          format="avif"
          quality="60"
          preload
          fetchpriority="high"
          loading="eager"
          class="h-full w-full object-cover animate-[slowzoom_40s_ease-in-out_infinite_alternate]"
      />
    </div>

      <!-- Bottom-up legibility gradient -->
    <div
        class="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,6,0.5)_0%,rgba(5,5,6,0)_28%,rgba(5,5,6,0)_46%,rgba(5,5,6,0.72)_84%,#050506_100%)]"
    />

      <!-- Content, flush with header/footer container. -->
    <div class="absolute inset-x-0 bottom-0 z-10">
      <div class="container mx-auto px-5 pb-38.75 md:px-8 xl:pb-28">
        <div class="mb-6 flex flex-wrap items-center gap-2">
          <!-- client cache layer -->
          <div
              v-if="fromClientCache"
              class="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur-[10px] text-shadow-none"
              :class="clientPill.cls"
          >
            <img
                :src="clientPill.mark"
                :width="getMarkSize(clientPill.mark).width"
                :height="getMarkSize(clientPill.mark).height"
                alt=""
                class="h-3.25 w-auto"
            >
            {{ clientPill.label }}
            <span class="hidden font-normal opacity-70 sm:inline">· {{ clientPill.layer }}</span>
          </div>
            <!-- server source layer -->
          <div
              class="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur-[10px] text-shadow-none"
              :class="serverPill.cls"
          >
            <img
                :src="serverPill.mark"
                :width="getMarkSize(serverPill.mark).width"
                :height="getMarkSize(serverPill.mark).height"
                alt=""
                class="h-3.25 w-auto"
            >
            {{ serverPill.label }}
            <span class="hidden font-normal opacity-70 sm:inline">· {{ serverPill.layer }}</span>
          </div>
        </div>

        <div
            class="mb-5.5 text-sm font-medium tracking-[0.01em] text-white/72 [text-shadow:0_1px_18px_rgba(0,0,0,0.55)]"
        >
          {{ hero?.tagline }}
          <template v-if="latestApod?.formattedDate">
            — {{ latestApod.formattedDate }}
          </template>
        </div>

        <h1
            class="m-0 max-w-[15ch] font-serif text-[clamp(46px,7.4vw,102px)] font-normal leading-[1.04] tracking-[-0.01em] text-balance md:leading-[0.94] [text-shadow:0_2px_30px_rgba(0,0,0,0.4)]"
        >
          {{ latestApod?.title ?? hero?.tagline }}
        </h1>

          <!-- Visual CTA (the whole stage is the actual link, see below) -->
        <span
            class="mt-8 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/8 px-6 py-3 text-sm font-medium text-white backdrop-blur-md transition-all group-hover:border-white/40 group-hover:bg-white/16"
        >
          {{ hero?.cta }}
          <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1"/>
        </span>
      </div>
    </div>

      <!-- The whole stage links to the gallery. -->
    <NuxtLink
        to="/apod"
        class="absolute inset-0 z-20"
        :aria-label="hero?.cta"
    />
  </section>
</template>
