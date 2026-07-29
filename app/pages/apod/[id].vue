<script setup lang="ts">
import { ArrowLeft, Pause, Play, Volume2, VolumeX } from "@lucide/vue";
import type { ApodEntry } from "#shared/types";

// Copy comes from the shared content via the cache chain.
const { content } = useSiteContent();
const all = computed(() => content.value?.apod.all);
const listPage = computed(() => content.value?.apod.listPage);
const common = computed(() => content.value?.common);

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
  // twitter:* inherit from og:* (X's documented fallback), so we don't repeat them.
});

const embed = computed(() =>
  item.value?.mediaType === "video" ? getApodEmbed(item.value.url) : null,
);

// Direct-file video: autoplays muted (autoplay is only allowed muted) and drives
// a custom control bar (play/pause, seek, mute) in the dark editorial style
// instead of the native controls, which look different in every browser.
const detailVideo = ref<HTMLVideoElement | null>(null);
const videoMuted = ref(true);
const isPaused = ref(false);
const currentTime = ref(0);
const duration = ref(0);

const togglePlay = () => {
  const video = detailVideo.value;
  if (!video) return;
  if (video.paused) video.play().catch(() => {});
  else video.pause();
};

const toggleMute = () => {
  const video = detailVideo.value;
  if (!video) return;
  video.muted = !video.muted;
  // Unmuting a video whose volume was dragged to 0 would stay silent, restore it.
  if (!video.muted && video.volume === 0) video.volume = 1;
};

const onSeek = (event: Event) => {
  const video = detailVideo.value;
  if (video) video.currentTime = Number((event.currentTarget as HTMLInputElement).value);
};

// mm:ss, e.g. 72 -> "1:12".
const formatMediaTime = (seconds: number): string => {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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

// NASA delivers the explanation as one blob, split it into readable paragraphs
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
   <div class="text-left">
    <NuxtLink
      to="/apod"
      class="mb-8 inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-foreground"
    >
      <ArrowLeft class="h-4 w-4" />
      {{ common?.backLabel }}
    </NuxtLink>

    <div class="mb-3 text-sm font-medium tracking-[0.01em] text-text-muted">
      {{ listPage?.title }}
    </div>
    <h1
      class="m-0 text-balance font-serif text-[clamp(40px,4.6vw,56px)] font-normal leading-[1.08] tracking-tight"
    >
      {{ item.title }}
    </h1>
    <p class="mb-8 mt-3 text-sm text-text-faint">
      {{ all?.fromLabel }} {{ item.formattedDate }}
    </p>

    <!-- Body: image (left) + narrow description column (right) on lg+ -->
    <div class="mt-8 grid gap-8 text-left lg:grid-cols-[1fr_320px] lg:items-start">
     <div>
      <!-- Media -->
      <div
        class="relative overflow-hidden rounded-2xl border border-muted bg-surface-card"
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
             image on error, the browser has no such fetch cap. -->
        <img
          v-if="rawImage"
          :src="item.hdurl || item.url"
          :alt="item.title"
          :width="RENDER_WIDTH"
          :height="imgHeight"
          class="block h-auto w-full lg:h-full lg:object-contain"
        >
        <!-- One px width per breakpoint, never a bare vw value, which does not
             resolve against the screens config and collapses the srcset to a
             single-candidate ladder (every device then pulls the widest image).
             The widths follow this layout: full container width up to lg, then
             the media column of the 2-column grid (container minus the 320px
             text column and the gap), capped at 1120 by the 1536 container. -->
        <NuxtImg
          v-else
          :src="item.hdurl || item.url"
          :alt="item.title"
          :width="RENDER_WIDTH"
          :height="imgHeight"
          sizes="600px sm:600px md:704px lg:608px xl:864px 2xl:1120px"
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

      <!-- Video: direct media file. Autoplays muted (autoplay is only allowed
           muted) and, as the page's main content, plays from the start. The
           custom control bar sits BELOW the frame, not overlaid: a bottom overlay
           would hide behind the fixed cache footer once scrolled into view. -->
      <div v-else-if="embed && embed.type === 'file'">
        <div class="aspect-video w-full">
          <video
            ref="detailVideo"
            :src="embed.src"
            class="h-full w-full object-contain"
            autoplay
            muted
            playsinline
            @play="isPaused = false"
            @pause="isPaused = true"
            @loadedmetadata="duration = ($event.currentTarget as HTMLVideoElement).duration"
            @durationchange="duration = ($event.currentTarget as HTMLVideoElement).duration"
            @timeupdate="currentTime = ($event.currentTarget as HTMLVideoElement).currentTime"
            @volumechange="videoMuted = ($event.currentTarget as HTMLVideoElement).muted"
          />
        </div>

        <div class="flex items-center gap-3 border-t border-muted px-3 py-2.5 text-white">
          <button
            type="button"
            class="grid size-9 shrink-0 place-items-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :aria-label="isPaused ? all?.playLabel : all?.pauseLabel"
            @click="togglePlay"
          >
            <Play v-if="isPaused" class="h-5 w-5 fill-white" />
            <Pause v-else class="h-5 w-5 fill-white" />
          </button>

          <span class="w-10 shrink-0 text-right text-xs tabular-nums text-text-muted">
            {{ formatMediaTime(currentTime) }}
          </span>

          <input
            type="range"
            min="0"
            :max="duration || 0"
            step="0.1"
            :value="currentTime"
            :aria-label="all?.seekLabel"
            :aria-valuetext="`${formatMediaTime(currentTime)} / ${formatMediaTime(duration)}`"
            class="flex-1 cursor-pointer accent-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @input="onSeek"
          >

          <span class="w-10 shrink-0 text-xs tabular-nums text-text-muted">
            {{ formatMediaTime(duration) }}
          </span>

          <button
            type="button"
            class="grid size-9 shrink-0 place-items-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :aria-label="videoMuted ? all?.unmuteLabel : all?.muteLabel"
            :aria-pressed="!videoMuted"
            @click="toggleMute"
          >
            <VolumeX v-if="videoMuted" class="h-5 w-5" />
            <Volume2 v-else class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- Fallback: link out to the source -->
      <div v-else class="p-8">
        <a
          :href="item.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 rounded-lg border border-white/16 bg-white/3 px-5 py-3 text-sm font-medium transition-colors hover:border-white/30 hover:bg-white/9"
        >
          {{ all?.viewSourceLabel }} ↗
        </a>
      </div>
      </div>
     </div>

     <div class="space-y-4">
       <p
         v-for="(para, i) in paragraphs"
         :key="i"
         class="text-sm leading-relaxed text-text-secondary"
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
