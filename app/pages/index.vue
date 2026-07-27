<script setup lang="ts">
import { ArrowRight } from "@lucide/vue";
import { hero } from "~/assets/json/static-text.json";
import type { ApodList } from "#shared/types";

useSeoMeta({
  title: "Nuxt Cache",
  description:
    "A Nuxt 4 demo that makes NASA's slow, rate-limited Astronomy Picture of the Day API feel instant with Redis and TanStack Vue Query caching.",
  ogTitle: "Nuxt Cache — making a slow API feel instant",
  ogDescription:
    "Multi-layer caching over NASA's APOD API: Redis on the server, TanStack Vue Query in the browser, with live cache-source badges and fetch timing.",
  twitterTitle: "Nuxt Cache — making a slow API feel instant",
  twitterDescription:
    "Multi-layer caching over NASA's APOD API: Redis on the server, TanStack Vue Query in the browser, with live cache-source badges and fetch timing.",
});

// Pull the latest APOD so the hero itself is delivered through Redis + TanStack.
const { data, serverSource, fromClientCache } = await useFetchApod<ApodList>();

// Newest APOD, any media type — the hero reflects today's actual entry.
const latestApod = computed(() => data.value?.entries?.[0] ?? null);

// A direct video file (mp4/webm) plays as an ambient hero background; embeds
// (YouTube/Vimeo) fall back to their thumbnail, images to the image itself.
const heroEmbed = computed(() =>
  latestApod.value?.mediaType === "video"
    ? getApodEmbed(latestApod.value.url)
    : null,
);
const heroVideo = computed(() =>
  heroEmbed.value?.type === "file" ? heroEmbed.value.src : null,
);
const heroImage = computed(() => {
  const entry = latestApod.value;
  if (!entry) return "/images/apod.jpg";
  if (entry.mediaType === "image") return entry.hdurl ?? entry.url;
  return entry.thumbnailUrl ?? "/images/apod.jpg";
});

// Video-hero poster: only when NASA actually provides a thumbnail. Its
// self-hosted .mp4s carry none, so we skip the poster (the generic fallback photo
// would flash an unrelated image before playback) and let the video paint its own
// representative frame over a neutral dark stage. When a real thumbnail exists it
// is routed through the image pipeline (IPX dev / Netlify CDN prod) as a sized WebP.
const img = useImage();
const heroVideoPoster = computed(() => {
  const thumb = latestApod.value?.thumbnailUrl;
  return thumb
    ? img(thumb, { width: 1280, height: 720, fit: "cover", format: "webp", quality: 70 })
    : undefined;
});

// Start the ambient hero video on a representative frame; autoplay only when the
// user hasn't asked for reduced motion (otherwise the still frame stands in).
const onHeroLoaded = (event: Event) => {
  seekVideoPreview(event);
  const video = event.currentTarget as HTMLVideoElement;
  const reducedMotion
    = import.meta.client && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducedMotion) video.play().catch(() => {});
};

const ytId = (u: string) =>
  u.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?v=|v\/))([\w-]{11})/)?.[1];
const vimeoId = (u: string) => u.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];

// Autoplay, muted, looping background embed for YouTube/Vimeo heroes.
const heroIframe = computed(() => {
  const e = heroEmbed.value;
  if (e?.type === "youtube") {
    const id = ytId(e.src);
    return id
      ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&playsinline=1&rel=0`
      : null;
  }
  if (e?.type === "vimeo") {
    const id = vimeoId(e.src);
    return id
      ? `https://player.vimeo.com/video/${id}?background=1&autoplay=1&muted=1&loop=1`
      : null;
  }
  return null;
});

// Two cache layers, both shown when true (mirrors the old ApiLogo + gallery
// cards): the client cache (Vue Query) and the server source (Redis warm / NASA
// cold or just-cleared). serverSource already flips to "nasa" after a Redis clear.
const clientPill = {
  label: hero.client,
  layer: hero.clientLayer,
  mark: "/svg/marks/query.svg",
  cls: "bg-[rgba(6,16,28,0.62)] border-[rgba(56,189,248,0.45)] text-[#7dd3fc]",
};

const serverPill = computed(() => {
  if (serverSource.value === "nitro") {
    return {
      label: hero.serverNitro,
      layer: hero.serverNitroLayer,
      mark: "/svg/marks/nitro.svg",
      cls: "bg-[rgba(6,20,12,0.62)] border-[rgba(74,222,128,0.45)] text-[#86efac]",
    };
  }
  if (serverSource.value === "redis") {
    return {
      label: hero.serverRedis,
      layer: hero.serverRedisLayer,
      mark: "/svg/marks/redis.svg",
      cls: "bg-[rgba(20,6,6,0.62)] border-[rgba(248,113,113,0.45)] text-[#fca5a5]",
    };
  }
  return {
    label: hero.serverNasa,
    layer: hero.serverNasaLayer,
    mark: "/svg/marks/nasa.svg",
    cls: "bg-[rgba(10,12,18,0.62)] border-[rgba(255,255,255,0.4)] text-[#fafafa]",
  };
});
</script>

<template>
  <section class="group relative h-[100dvh] min-h-[600px] overflow-hidden">
    <!-- Background: newest APOD. A direct video file or a YouTube/Vimeo embed
         plays muted+looping; otherwise a single responsive AVIF image. The
         wrapper does a one-off fade + zoom-in on mount; the inner image keeps
         its endless ambient slowzoom. The two live on separate elements on
         purpose: both animate transform: scale, and two scale animations on the
         same element would overwrite each other. Splitting them lets the entry
         zoom and the ambient drift compose instead of clash. -->
    <div class="absolute inset-0 overflow-hidden [animation:heroZoomIn_0.9s_ease-out]">
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
        :alt="latestApod?.title ?? hero.tagline"
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
      <div class="container mx-auto px-5 pb-[155px] md:px-8 xl:pb-[112px]">
        <div class="mb-6 flex flex-wrap items-center gap-2">
          <!-- client cache layer -->
          <div
            v-if="fromClientCache"
            class="inline-flex items-center gap-2 rounded-full border px-[14px] py-[6px] text-[12.5px] font-medium backdrop-blur-[10px] [text-shadow:none]"
            :class="clientPill.cls"
          >
            <img
              :src="clientPill.mark"
              :width="getMarkSize(clientPill.mark).width"
              :height="getMarkSize(clientPill.mark).height"
              alt=""
              class="h-[13px] w-auto"
            >
            {{ clientPill.label }}
            <span class="hidden font-normal opacity-70 sm:inline">· {{ clientPill.layer }}</span>
          </div>
          <!-- server source layer -->
          <div
            class="inline-flex items-center gap-2 rounded-full border px-[14px] py-[6px] text-[12.5px] font-medium backdrop-blur-[10px] [text-shadow:none]"
            :class="serverPill.cls"
          >
            <img
              :src="serverPill.mark"
              :width="getMarkSize(serverPill.mark).width"
              :height="getMarkSize(serverPill.mark).height"
              alt=""
              class="h-[13px] w-auto"
            >
            {{ serverPill.label }}
            <span class="hidden font-normal opacity-70 sm:inline">· {{ serverPill.layer }}</span>
          </div>
        </div>

        <div
          class="mb-[22px] text-[15px] font-medium tracking-[0.01em] text-white/[0.72] [text-shadow:0_1px_18px_rgba(0,0,0,0.55)]"
        >
          {{ hero.tagline }}
          <template v-if="latestApod?.formattedDate">
            — {{ latestApod.formattedDate }}
          </template>
        </div>

        <h1
          class="m-0 max-w-[15ch] font-serif text-[clamp(46px,7.4vw,102px)] font-normal leading-[1.04] tracking-[-0.01em] text-balance md:leading-[0.94] [text-shadow:0_2px_30px_rgba(0,0,0,0.4)]"
        >
          {{ latestApod?.title ?? hero.tagline }}
        </h1>

        <!-- Visual CTA (the whole stage is the actual link, see below) -->
        <span
          class="mt-8 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.08] px-6 py-3 text-sm font-medium text-white backdrop-blur-md transition-all group-hover:border-white/40 group-hover:bg-white/[0.16]"
        >
          {{ hero.cta }}
          <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </div>

    <!-- The whole stage links to the gallery. -->
    <NuxtLink
      to="/apod"
      class="absolute inset-0 z-20"
      :aria-label="hero.cta"
    />
  </section>
</template>
