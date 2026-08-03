// https://nuxt.com/docs/api/configuration/nuxt-config

import tailwindcss from "@tailwindcss/vite";
import imageConfig from "./app/utils/getImageConfig";

// Single source for site identity: `site` feeds nuxt-schema-org (via
// nuxt-site-config), `runtimeConfig.public` feeds the meta tags in app.vue.
// Kept as one constant so the canonical URL can't drift between the two.
const site = {
  url: "https://nuxt-cache-project.netlify.app",
  name: "Nuxt Cache Project",
  // Written for the SERP window (120 to 160 characters), which is also what the
  // schema.org WebSite node carries.
  description:
    "A Nuxt 4 demo of multi-layer caching over the NASA Astronomy Picture of the Day API: validated on the server, cached in Redis, cached again in the browser.",
};

// Share-card defaults for the pages that have no APOD entry of their own. The
// description is a separate, shorter string because a mobile preview cuts around
// 125 characters, well before the SERP does.
const social = {
  description:
    "A Nuxt 4 demo of multi-layer caching over the NASA APOD API, with Redis on the server and TanStack Query in the browser.",
  imageAlt:
    "A planetary nebula glowing pink, blue and red against a dense field of stars.",
};

export default defineNuxtConfig({
  ssr: true,

  runtimeConfig: {
    nasaApiKey: "",
    public: {
      siteName: site.name,
      siteDescription: site.description,
      socialDescription: social.description,
      socialImageAlt: social.imageAlt,
      siteUrl: site.url,
      language: "en-US",
    },
  },

  site,

  schemaOrg: {
    // The linked identity behind every page. A Person, not an Organization:
    // this is a personal demo, and an organization that doesn't exist would be
    // an invented claim. The sameAs profiles are the links the site already
    // shows (header GitHub link, about-page credit).
    identity: {
      type: "Person",
      name: "Melanie Stief",
      url: site.url,
      sameAs: ["https://github.com/Milenoi", "https://viridis.de"],
    },
  },

  typescript: {
    // Stricter than the Nuxt defaults; injected into the generated tsconfigs.
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true,
        noImplicitOverride: true,
        noFallthroughCasesInSwitch: true,
      },
    },
  },

  devtools: {
    enabled: true,
  },

  // Global stylesheet: Tailwind v4 entry + design tokens + toast base styles.
  css: ["~/assets/css/tailwind.css", "vue-sonner/style.css"],

  modules: [
    "@nuxt/eslint",
    "@nuxt/image",
    "@nuxt/fonts",
    "shadcn-nuxt",
    "nuxt-schema-org",
  ],

  // shadcn-vue: no component prefix, components live under ~/components/ui.
  shadcn: {
    prefix: "Ui",
    componentDir: "@/components/ui",
  },

  // Preload the two above-the-fold families (serif hero heading + sans body) so
  // the font isn't discovered late in the critical chain, shaves the FOUT.
  // Scoped to these families on purpose; preloading everything would over-fetch.
  fonts: {
    families: [
      { name: "Newsreader", preload: true },
      { name: "Schibsted Grotesk", preload: true },
    ],
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: true, // default
    },
    // Pre-bundle these so dev doesn't reload on first discovery.
    optimizeDeps: {
      include: [
        "@tanstack/vue-query",
        "@vue/devtools-core",
        "@vue/devtools-kit",
      ],
    },
  },

  routeRules: {
    // APOD routes send no cache-control at all, their Redis/NASA indicator has
    // to stay live. Caveat: `/` shows those pills too and DOES carry the header,
    // so on a warm CDN hit they are as old as the cached copy (up to an hour).
    // Fine for a demo, in-app navigation refetches through the never-cached API.
    "/": {
      headers: {
        "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
    "/about": {
      headers: {
        "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
    "/how": {
      headers: {
        "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
    "/faq": {
      headers: {
        "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  },

  nitro: {
    publicAssets: [
      {
        baseURL: "images",
        dir: "public/images",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      },
    ],
    compressPublicAssets: {
      gzip: true,
      brotli: true,
    },
    prerender: {
      failOnError: false,
      // crawlLinks: true
    },
    storage: {
      /* redis: {
                             driver: 'redis',
                             /!* redis connector options *!/
                             port: 6379, // Redis port
                             host: "localhost", // Redis host
                             username: "", // needs Redis >= 6
                             password: "",
                             db: 0,
                             ttl: 86400 // Defaults to 0
                         },*/
      redis: {
        driver: "redis",
        /* redis connector options */
        port: process.env.NUXT_REDIS_PORT,
        host: process.env.NUXT_REDIS_HOST,
        username: process.env.NUXT_REDIS_USERNAME,
        password: process.env.NUXT_REDIS_PASSWORD,
        ttl: 86400, // Defaults to 0
      },
      // Kept IN-MEMORY on purpose: a warm hit never leaves the server process,
      // which is the whole point of a front cache, it beats the Redis round-trip.
      // Trade-off: it dies with a serverless cold start and is not shared between
      // instances, so a miss falls through to the shared Redis layer below.
      cache: {
        driver: "memory",
      },
    },
  },

  image: imageConfig,
  compatibilityDate: "2025-01-20",
});