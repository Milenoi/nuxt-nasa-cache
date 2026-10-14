<script setup lang="ts">
import { ArrowLeft, Pause, Play, Volume2, VolumeX } from "@lucide/vue";
import { useElementSize, useWindowSize } from "@vueuse/core";
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

// Two cuts of the same explanation: the SERP snippet has room for ~160
// characters, a share card on mobile cuts at ~125.
const seoDescription = computed(() =>
  getSeoDescription(item.value?.explanation ?? "", SEO_DESCRIPTION_MAX),
);
const socialDescription = computed(() =>
  getSeoDescription(item.value?.explanation ?? "", SOCIAL_DESCRIPTION_MAX),
);

const { ogImage, ogImageAlt } = useApodOgImage(item);

// NASA titles carry straight apostrophes too, and og:title is an attribute value
// like the descriptions are.
const metaTitle = computed(() =>
  getMetaText(item.value?.title ?? "Astronomy Picture of the Day"),
);

useSeoMeta({
  title: () => `${metaTitle.value} - Nuxt Cache`,
  description: () => seoDescription.value,
  ogTitle: () => metaTitle.value,
  ogDescription: () => socialDescription.value,
  ogImage: () => ogImage.value,
  ogImageAlt: () => ogImageAlt.value,
  // twitter:* inherit from og:* (X's documented fallback), so we don't repeat them.
});

// Structured data: the entry as this page's primary image or as its video,
// linked into the WebPage node instead of floating next to it. `mediaType:
// "other"` gets neither, only the page itself. Name and description are
// explicit, otherwise the module falls back to the site-wide description.
// `item` is already resolved here because useFetchApod awaits suspense.
const { siteUrl } = useRuntimeConfig().public;

useSchemaBreadcrumb(item.value?.title);

const entryMedia = computed(() => {
  const entry = item.value;
  if (entry?.mediaType === "image") {
    return { primaryImageOfPage: getApodImageNode(entry) };
  }
  if (entry?.mediaType === "video") {
    return { video: getApodVideoNode(entry, siteUrl) };
  }
  return {};
});

useSchemaOrg([
  defineWebPage({
    name: () => item.value?.title,
    description: () => seoDescription.value,
    datePublished: () => item.value?.date,
    ...entryMedia.value,
  }),
]);

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

const isImage = computed(() => item.value?.mediaType === "image");

// The card sticks as early as it can while its last line still clears the fixed footer:
// at its resting offset when it fits the screen, otherwise once its end comes into view.
const CARD_REST_TOP = 148;
const FOOTER_CLEARANCE = 80;
const textCard = useTemplateRef<HTMLElement>("textCard");
const { height: cardHeight } = useElementSize(textCard, undefined, { box: "border-box" });
const { height: windowHeight } = useWindowSize();
const cardTop = computed(() =>
  Math.min(CARD_REST_TOP, windowHeight.value - cardHeight.value - FOOTER_CLEARANCE),
);

// At full row width anything narrower than 3:2 outgrows a laptop screen, and sticking it
// would hide its lower edge. Unknown dimensions count as wide.
const isWide = computed(() => {
  const { width, height } = item.value ?? {};
  return !width || !height || width / height >= 1.5;
});

const dateLabel = computed(() => `${all.value?.fromLabel ?? ""} ${item.value?.formattedDate ?? ""}`.trim());

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
  <div v-if="item" class="relative isolate">
    <!-- Kept outside the animated section: its transform would shrink this fixed layer
         to the section's box for the length of the fade. -->
    <div
      v-if="isImage"
      class="fixed inset-y-0 left-1/2 -z-10 w-full max-w-480 -translate-x-1/2 overflow-hidden"
    >
      <!-- A 64px render is enough once it is blurred this far. -->
      <NuxtImg
        v-if="!rawImage"
        :src="item.hdurl || item.url"
        alt=""
        width="64"
        densities="x1"
        format="webp"
        quality="50"
        class="absolute inset-0 size-full scale-125 object-cover opacity-70 blur-3xl saturate-150"
      />
      <div class="absolute inset-0 bg-linear-to-b from-background/60 via-background/40 to-background/80" />
    </div>

  <section class="pb-40 animate-fade-up">
    <div v-if="isImage" class="relative min-h-dvh">
      <div class="container mx-auto px-5 pt-24 md:px-8">
        <NuxtLink
          to="/apod"
          class="mb-8 inline-flex items-center gap-2 text-sm text-text-strong transition-colors hover:text-foreground"
        >
          <ArrowLeft class="h-4 w-4" />
          {{ common?.backLabel }}
        </NuxtLink>

        <!-- The card overlaps the picture so part of it shows blurred through the glass. -->
        <div class="lg:flex lg:flex-row-reverse lg:items-start">
          <!-- top-49 is the figure's resting offset, so it sticks without moving first. -->
          <figure
            class="my-0 w-full lg:mt-12 lg:min-w-0 lg:flex-1"
            :class="isWide && 'lg:sticky lg:top-49'"
          >
            <!-- NASA originals can reach 6000px and time out the Netlify optimizer (502);
                 the raw image has no such fetch cap. -->
            <img
              v-if="rawImage"
              :src="item.hdurl || item.url"
              :alt="item.title"
              :width="RENDER_WIDTH"
              :height="imgHeight"
              class="h-auto w-full drop-shadow-2xl"
            >
            <!-- Rendered widths in px, never vw (collapses the srcset): container minus
                 gutter; from lg the row minus the card plus its 8rem overlap. -->
            <NuxtImg
              v-else
              :src="item.hdurl || item.url"
              :alt="item.title"
              :width="RENDER_WIDTH"
              :height="imgHeight"
              sizes="600px sm:600px md:704px lg:704px xl:858px 2xl:1024px"
              densities="x1"
              format="avif"
              quality="80"
              fetchpriority="high"
              class="h-auto w-full drop-shadow-2xl"
              @error="rawImage = true"
            />
          </figure>

          <article
            ref="textCard"
            class="relative z-10 mt-8 rounded-3xl border border-white/10 bg-background/40 p-7 shadow-2xl backdrop-blur-sm backdrop-saturate-150 md:p-12 lg:sticky lg:top-(--card-top) lg:-mr-32 lg:mt-0 lg:w-2/5 lg:max-w-xl lg:shrink-0"
            :style="{ '--card-top': `${cardTop}px` }"
          >
            <ApodDetailText
              :eyebrow="listPage?.title"
              :title="item.title"
              :date-label="dateLabel"
              :paragraphs="paragraphs"
              :copyright="item.copyright"
            >
              <template #aside>
                <ApodCacheBadge :server-source="serverSource" class="shrink-0" />
              </template>
            </ApodDetailText>
          </article>
        </div>
      </div>
    </div>

    <div v-else class="container mx-auto px-5 pt-32 md:px-8">
      <NuxtLink
        to="/apod"
        class="mb-8 inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft class="h-4 w-4" />
        {{ common?.backLabel }}
      </NuxtLink>

      <div class="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-muted bg-surface-card">

        <!-- Video: embeddable provider (YouTube / Vimeo), 16:9 reserved -->
        <div
          v-if="embed && (embed.type === 'youtube' || embed.type === 'vimeo')"
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

        <!-- Muted because browsers only allow muted autoplay. Controls sit below the
             frame: an overlay would hide behind the fixed cache footer. -->
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

    <div v-if="!isImage" class="container mx-auto mt-10 px-5 md:px-8">
      <article
        class="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-surface-glass p-7 shadow-2xl backdrop-blur-2xl backdrop-saturate-150 md:p-12"
      >
        <ApodDetailText
          :eyebrow="listPage?.title"
          :title="item.title"
          :date-label="dateLabel"
          :paragraphs="paragraphs"
          :copyright="item.copyright"
        >
          <template #aside>
            <ApodCacheBadge :server-source="serverSource" class="shrink-0" />
          </template>
        </ApodDetailText>
      </article>
    </div>
  </section>
  </div>
</template>
