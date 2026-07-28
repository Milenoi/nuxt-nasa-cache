<script setup lang="ts">
const { siteName, siteDescription, siteUrl, language } =
  useRuntimeConfig().public;
const ogImage = `${siteUrl}/og-image.jpg`;

// Canonical / og:url track the current route so every page points at itself
// (not the homepage), and duplicate ?type= variants collapse to one canonical.
const route = useRoute();
const canonical = computed(() => `${siteUrl}${route.path}`);

// Global SEO + social share defaults (pages override title/description/og/twitter).
useSeoMeta({
  description: siteDescription,
  ogSiteName: siteName,
  ogType: "website",
  ogTitle: siteName,
  ogDescription: siteDescription,
  ogUrl: () => canonical.value,
  ogImage,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  // twitter:title/description are omitted — X falls back to the og:* tags, so
  // duplicating them is deprecated noise. Card type + image are still explicit.
  twitterCard: "summary_large_image",
  twitterImage: ogImage,
});

useHead({
  htmlAttrs: {
    lang: language,
  },
  meta: [
    {
      name: "msapplication-TileColor",
      content: "#2c2d33",
    },
    {
      name: "theme-color",
      content: "#0b3d91",
    },
    {
      name: "charset",
      content: "utf-8",
    },
  ],
  link: [
    { rel: "canonical", href: () => canonical.value },
    {
      rel: "icon",
      type: "image/svg+xml",
      href: "/favicon.svg",
    },
    {
      rel: "icon",
      type: "image/x-icon",
      href: "/favicon.ico",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      href: "/favicon-32x32.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      href: "/favicon-16x16.png",
    },
    {
      rel: "apple-touch-icon",
      href: "/apple-touch-icon.png",
    },
    {
      rel: "manifest",
      href: "/site.webmanifest",
    },
  ],
});

// Vue Query Devtools — dev only, lazy-loaded so it is tree-shaken out of prod.
const VueQueryDevtools = import.meta.dev
  ? defineAsyncComponent(() =>
      import("@tanstack/vue-query-devtools").then((m) => m.VueQueryDevtools),
    )
  : null;
</script>

<template>
  <NuxtLoadingIndicator
    :color="'#66BB6A'"
    :duration="2000"
    :height="3"
    :throttle="200"
  />

  <NuxtLayout>
    <NuxtPage />
    <ClientOnly>
      <component :is="VueQueryDevtools" v-if="VueQueryDevtools" />
    </ClientOnly>
  </NuxtLayout>
</template>
