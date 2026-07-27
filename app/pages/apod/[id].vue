<script setup lang="ts">
import { ArrowLeft, Volume2, VolumeX } from "@lucide/vue";
import { apod, common } from "~/assets/json/static-text.json";
import type { ApodEntry } from "#shared/types";

const { all, listPage } = apod;

const route = useRoute();
const id = route.params.id as string;

// The slug is a date. Reject anything else with a real 404 page (otherwise the
// failed fetch is swallowed by vue-query's suspense and the page renders blank).
if (!/^\d{4}-\d{2}-\d{2}$/.test(id)) {
  throw createError({
    statusCode: 404,
    statusMessage: "Page not found.",
    fatal: true,
  });
}

// Fetch a single APOD entry by date.
const { data: item, serverSource } = await useFetchApod<ApodEntry>(id);

const seoDescription = computed(() => {
  const text = item.value?.explanation ?? "";
  return text.length > 200 ? `${text.slice(0, 197).trimEnd()}…` : text;
});

useSeoMeta({
  title: () =>
    `${item.value?.title ?? "Astronomy Picture of the Day"} - Nuxt Cache`,
  description: () => seoDescription.value,
  ogTitle: () => item.value?.title ?? "Astronomy Picture of the Day",
  ogDescription: () => seoDescription.value,
  ogImage: () => item.value?.thumbnailUrl || item.value?.url,
  twitterTitle: () => item.value?.title ?? "Astronomy Picture of the Day",
  twitterDescription: () => seoDescription.value,
  twitterImage: () => item.value?.thumbnailUrl || item.value?.url,
});

const embed = computed(() =>
  item.value?.mediaType === "video" ? getApodEmbed(item.value.url) : null,
);

// Direct-file video: autoplay muted+looping (autoplay is only allowed muted),
// with a custom control to turn the sound on/off — the native controls bar
// would clash with the dark editorial design.
const detailVideo = ref<HTMLVideoElement | null>(null);
const videoMuted = ref(true);
const toggleMute = () => {
  const video = detailVideo.value;
  if (!video) return;
  video.muted = !video.muted;
  // Unmuting a video whose volume was dragged to 0 would stay silent — restore it.
  if (!video.muted && video.volume === 0) video.volume = 1;
};

// Reserve the image's real aspect ratio to avoid layout shift. We request a
// 1200px-wide render and derive a proportional height from the probed
// dimensions; undefined (video/other/unknown) falls back to natural height.
const RENDER_WIDTH = 1200;
const imgHeight = computed(() => {
  const { width, height } = item.value ?? {};
  if (!width || !height) return undefined;
  return Math.round((RENDER_WIDTH * height) / width);
});

// Flips to true if the optimized image errors (e.g. Netlify 502 on a huge, slow
// NASA source); we then render the raw NASA image instead.
const rawImage = ref(false);

// NASA delivers the explanation as one blob — split it into readable paragraphs
// of ~2 sentences each.
const paragraphs = computed(() => {
  const text = item.value?.explanation ?? "";
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]?(?:\s|$)/g) ?? [text];
  const groups: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    groups.push(sentences.slice(i, i + 2).join(" ").trim());
  }
  return groups.filter(Boolean);
});
</script>

<template>
  <section
    v-if="item"
    class="container mx-auto min-h-screen px-5 pb-40 pt-32 md:px-8 [animation:fadeUp_0.4s_ease]"
  >
   <div class="text-center lg:text-left">
    <NuxtLink
      to="/apod"
      class="mb-8 inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-foreground"
    >
      <ArrowLeft class="h-4 w-4" />
      {{ common.backLabel }}
    </NuxtLink>

    <div class="mb-3 text-[15px] font-medium tracking-[0.01em] text-text-muted">
      {{ listPage.title }}
    </div>
    <h1
      class="m-0 mx-auto max-w-[92%] text-balance text-center font-serif text-[clamp(40px,4.6vw,56px)] font-normal leading-[1.08] tracking-tight lg:mx-0 lg:max-w-none lg:text-left"
    >
      {{ item.title }}
    </h1>
    <p class="mb-8 mt-3 text-sm text-text-faint">
      {{ all.fromLabel }} {{ item.formattedDate }}
    </p>

    <!-- Body: image (left) + narrow description column (right) on lg+ -->
    <div class="mt-8 grid gap-8 text-center lg:grid-cols-[1fr_320px] lg:items-start lg:text-left">
     <div>
      <!-- Media -->
      <div
        class="relative overflow-hidden rounded-2xl border border-[#17171a] bg-surface-card"
      >
        <ApodCacheBadge
        :server-source="serverSource"
        class="absolute left-3 top-3 z-10"
      />

      <!-- Image: full natural-ratio width on mobile; fixed 3:2 (contain) only in
           the 2-column layout, where a reserved box keeps the grid aligned. -->
      <div v-if="item.mediaType === 'image'" class="w-full lg:aspect-[3/2]">
        <!-- Some APOD originals are huge (6000px+) and NASA can be slow, so the
             Netlify image optimizer times out (502). Fall back to the raw NASA
             image on error — the browser has no such fetch cap. -->
        <img
          v-if="rawImage"
          :src="item.hdurl || item.url"
          :alt="item.title"
          :width="RENDER_WIDTH"
          :height="imgHeight"
          class="block h-auto w-full lg:h-full lg:object-contain"
        >
        <NuxtImg
          v-else
          :src="item.hdurl || item.url"
          :alt="item.title"
          :width="RENDER_WIDTH"
          :height="imgHeight"
          sizes="100vw lg:1120px"
          densities="x1"
          format="avif"
          quality="80"
          :placeholder="[80, 53, 40, 6]"
          class="block h-auto w-full lg:h-full lg:object-contain"
          @error="rawImage = true"
        />
      </div>

      <!-- Video: embeddable provider (YouTube / Vimeo), 16:9 reserved -->
      <div
        v-else-if="embed && (embed.type === 'youtube' || embed.type === 'vimeo')"
        class="aspect-video w-full"
      >
        <iframe
          :src="embed.src"
          title="APOD video"
          class="h-full w-full"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        />
      </div>

      <!-- Video: direct media file, 16:9 reserved -->
      <div v-else-if="embed && embed.type === 'file'" class="relative aspect-video w-full">
        <video
          ref="detailVideo"
          :src="embed.src"
          class="h-full w-full object-contain"
          autoplay
          muted
          loop
          playsinline
          @volumechange="videoMuted = ($event.target as HTMLVideoElement).muted"
        />
        <!-- Top-right: the fixed cache footer overlaps the video's bottom edge
             once it scrolls into view, so a bottom-anchored control would hide
             behind it. -->
        <button
          type="button"
          class="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full border border-white/25 bg-[rgba(6,6,8,0.55)] text-white backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-[rgba(6,6,8,0.78)]"
          :aria-label="videoMuted ? all.unmuteLabel : all.muteLabel"
          :aria-pressed="!videoMuted"
          @click="toggleMute"
        >
          <VolumeX v-if="videoMuted" class="h-5 w-5" />
          <Volume2 v-else class="h-5 w-5" />
        </button>
      </div>

      <!-- Fallback: link out to the source -->
      <div v-else class="p-8 text-center">
        <a
          :href="item.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 rounded-lg border border-white/[0.16] bg-white/[0.03] px-5 py-3 text-sm font-medium transition-colors hover:border-white/30 hover:bg-white/[0.09]"
        >
          {{ all.viewSourceLabel }} ↗
        </a>
      </div>
      </div>
     </div>

     <div class="space-y-4">
       <p
         v-for="(para, i) in paragraphs"
         :key="i"
         class="text-[15px] leading-relaxed text-text-secondary"
       >
         {{ para }}
       </p>
       <p v-if="item.copyright" class="pt-2 text-xs text-text-faint">
         © {{ item.copyright }}
       </p>
     </div>
    </div>
   </div>
  </section>
</template>
