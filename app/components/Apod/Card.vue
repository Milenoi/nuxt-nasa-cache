<script setup lang="ts">
import { Play, Telescope } from "@lucide/vue";
import { useIntersectionObserver } from "@vueuse/core";
import { apod, menu } from "~/assets/json/static-text.json";
import type { ApodEntry, ApodSource } from "#shared/types";

const props = defineProps<{ entry: ApodEntry; serverSource: ApodSource }>();

const to = computed(() => `${menu.apod.link}/${props.entry.date}`);
const isVideo = computed(() => props.entry.mediaType === "video");

const videoEl = ref<HTMLVideoElement | null>(null);
const isPlaying = ref(false);
// Bind the video src only once the card nears the viewport, so a long
// video-filtered list never fetches every clip's metadata/frame at once.
const shouldLoad = ref(false);
const inView = ref(false);

const prefersReducedMotion = () =>
  import.meta.client
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Autoplay (muted) only while the card is in view and the user hasn't asked for
// reduced motion; pause otherwise. Called from the observer and once the video
// has loaded (play() before the src is bound would just no-op).
const syncPlayback = () => {
  const video = videoEl.value;
  if (!video) return;
  if (inView.value && !prefersReducedMotion()) {
    video.muted = true; // required for muted autoplay
    video.play().catch(() => {}); // ignore autoplay rejections
  }
  else {
    video.pause();
  }
};

useIntersectionObserver(
  videoEl,
  ([observerEntry]) => {
    inView.value = observerEntry?.isIntersecting ?? false;
    if (inView.value) shouldLoad.value = true;
    syncPlayback();
  },
  { threshold: 0.25, rootMargin: "200px" },
);

// On metadata load: seek past the (often black) intro to a representative frame,
// then start playback if the card is in view (and motion is allowed).
const onVideoLoaded = (event: Event) => {
  seekVideoPreview(event);
  syncPlayback();
};
// Thumbnail: the image itself, or a video's provided thumbnail.
const imageSrc = computed(() =>
  props.entry.mediaType === "image"
    ? props.entry.url
    : props.entry.thumbnailUrl || null,
);
</script>

<template>
  <NuxtLink
    :to="to"
    class="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#17171a] bg-surface-card"
  >
    <div class="relative aspect-[3/2] shrink-0 overflow-hidden">
      <NuxtImg
        v-if="imageSrc"
        :src="imageSrc"
        :alt="entry.title"
        width="600"
        height="400"
        sizes="100vw sm:50vw lg:420px"
        densities="x1"
        fit="cover"
        format="avif"
        quality="70"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
      />
      <!-- Video without a NASA thumbnail (NASA only returns thumbnail_url for
           embedded videos, not its self-hosted .mp4 files): render the video and
           seek to a representative frame (see seekToPreviewFrame) as the preview.
           A dark gradient backs it while that frame loads / if none renders. -->
      <video
        v-else-if="isVideo"
        ref="videoEl"
        :src="shouldLoad ? entry.url : undefined"
        class="h-full w-full bg-[radial-gradient(circle_at_50%_35%,#1b1b22,#0b0b0e)] object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
        preload="metadata"
        muted
        loop
        playsinline
        @loadedmetadata="onVideoLoaded"
        @play="isPlaying = true"
        @pause="isPlaying = false"
      />
      <div v-else class="flex h-full w-full items-center justify-center text-text-faint">
        <Telescope class="h-8 w-8" />
      </div>

      <!-- both-cache badge -->
      <ApodCacheBadge :server-source="serverSource" class="absolute left-3 top-3" />

      <!-- video overlays -->
      <template v-if="isVideo">
        <span
          class="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/[0.16] bg-[rgba(6,6,8,0.6)] px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm"
        >
          <Play class="h-3 w-3 fill-white" />
          {{ apod.all.videoLabel }}
        </span>
        <span
          v-if="!isPlaying"
          class="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <span
            class="grid size-[54px] place-items-center rounded-full border border-white/50 bg-[rgba(6,6,8,0.42)] text-white backdrop-blur-sm"
          >
            <Play class="h-5 w-5 fill-white" />
          </span>
        </span>
      </template>
    </div>

    <div class="flex-1 p-4">
      <time :datetime="entry.date" class="mb-1.5 block text-xs text-text-faint">
        {{ entry.formattedDate }}
      </time>
      <h3 class="text-[15px] font-medium leading-snug tracking-tight text-foreground">
        {{ entry.title }}
      </h3>
      <p v-if="entry.copyright" class="mt-2 truncate text-xs text-text-faint">
        © {{ entry.copyright }}
      </p>
    </div>
  </NuxtLink>
</template>
