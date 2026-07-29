<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import type { ApodList, ApodMediaType } from "#shared/types";

// Copy + SEO come from the shared content via the cache chain.
const { content } = useSiteContent();
const listPage = computed(() => content.value?.apod.listPage);
const all = computed(() => content.value?.apod.all);
const seo = computed(() => content.value?.seo?.apod);

const { data, serverSource, isPending } = await useFetchApod<ApodList>();

const { siteUrl } = useRuntimeConfig().public;

useSeoMeta({
  title: () => seo.value?.title,
  description: () => seo.value?.description,
  ogTitle: () => seo.value?.title,
  ogDescription: () => seo.value?.description,
});

// Structured data: this page is a collection of the last 60 entries.
// The ItemList deliberately describes ALL entries, not the filtered ones: the
// canonical URL drops the ?type= query, so every filter variant collapses to
// /apod, and a filtered list would make the same canonical page claim something
// different depending on which filter URL was crawled.
useSchemaBreadcrumb();
useSchemaOrg([
  defineWebPage({
    "@type": "CollectionPage",
    name: () => seo.value?.title,
    description: () => seo.value?.description,
  }),
  defineItemList({
    itemListElement: getApodListItems(data.value?.entries ?? [], siteUrl),
  }),
]);

// Media-type filter (all / image / video), synced to the URL query.
const mediaFilter = useRouteQuery<"all" | ApodMediaType>("type", "all", {
  mode: "push",
});

const filters = computed(() => [
  { value: "all", label: all.value?.filterAll },
  { value: "image", label: all.value?.filterImages },
  { value: "video", label: all.value?.filterVideos },
] as const);

const filteredEntries = computed(() => {
  const entries = data.value?.entries ?? [];
  if (mediaFilter.value === "image" || mediaFilter.value === "video") {
    return entries.filter((entry) => entry.mediaType === mediaFilter.value);
  }
  return entries;
});
</script>

<template>
  <section
    class="container mx-auto min-h-screen px-5 pb-40 pt-32 md:px-8 [animation:fadeUp_0.4s_ease]"
  >
    <!-- Header: tagline + heading, with the segmented media filter -->
    <div class="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="mb-3 text-sm font-medium tracking-[0.01em] text-text-muted">
          {{ listPage?.title }}
        </div>
        <h1
          class="m-0 font-serif text-[clamp(42px,5.4vw,68px)] font-normal leading-none tracking-tight"
        >
          {{ listPage?.heading }}
        </h1>
      </div>

      <div
        role="group"
        aria-label="Filter by media type"
        class="inline-flex items-center gap-1 rounded-[11px] border border-border bg-surface-panel p-1"
      >
        <button
          v-for="f in filters"
          :key="f.value"
          type="button"
          :aria-pressed="mediaFilter === f.value"
          class="rounded-lg px-4 py-2 text-sm font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          :class="
            mediaFilter === f.value
              ? 'bg-accent text-foreground'
              : 'text-text-secondary hover:text-foreground'
          "
          @click="mediaFilter = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Loading skeletons -->
    <div
      v-if="isPending"
      class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div
        v-for="n in 6"
        :key="n"
        class="overflow-hidden rounded-2xl border border-muted bg-surface-card"
      >
        <UiSkeleton class="aspect-[3/2] w-full rounded-none" />
        <div class="space-y-2 p-4">
          <UiSkeleton class="h-3 w-2/3" />
          <UiSkeleton class="h-2.5 w-2/5" />
        </div>
      </div>
    </div>

    <!-- Grid -->
    <ul
      v-else-if="filteredEntries.length"
      class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      <li v-for="entry in filteredEntries" :key="entry.date">
        <ApodCard :entry="entry" :server-source="serverSource" />
      </li>
    </ul>

    <!-- Empty -->
    <p v-else class="text-text-muted">{{ all?.noResult }}</p>
  </section>
</template>
