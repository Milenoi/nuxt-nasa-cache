// https://nuxt.com/docs/api/configuration/nuxt-config

import tailwindcss from "@tailwindcss/vite";
import imageConfig from "./app/utils/getImageConfig";

export default defineNuxtConfig({
  ssr: true,

  runtimeConfig: {
    nasaApiKey: "",
    public: {
      siteName: "Nuxt Cache Project",
      siteDescription:
        "A Nuxt 4 demo of multi-layer caching (Redis + TanStack Query) over the NASA APOD API.",
      siteUrl: "https://nuxt-cache-project.netlify.app",
      language: "en-US",
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

  modules: ["@nuxt/eslint", "@nuxt/image", "@nuxt/fonts", "shadcn-nuxt"],

  // shadcn-vue: no component prefix, components live under ~/components/ui.
  shadcn: {
    prefix: "Ui",
    componentDir: "@/components/ui",
  },

  // Preload the two above-the-fold families (serif hero heading + sans body) so
  // the font isn't discovered late in the critical chain — shaves the FOUT.
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
    // Static pages: let the CDN cache and revalidate them in the background.
    // APOD routes stay SSR so the Redis/NASA cache indicator is always live.
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
      // Nitro's own cache layer (defineCachedFunction / SWR). Kept IN-MEMORY (in
      // the server process) on purpose: a warm hit never leaves the process, so
      // it is genuinely faster than the Redis network round-trip — that's the
      // point of a front cache. The trade-off: it does not survive serverless
      // cold starts and is not shared between instances, so on a miss the request
      // simply falls through to the persistent, shared Redis layer below.
      cache: {
        driver: "memory",
      },
    },
  },

  image: imageConfig,
  compatibilityDate: "2025-01-20",
});