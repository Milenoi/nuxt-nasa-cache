<script setup lang="ts">
// Fixed, transparent, blurred-gradient header. Replaces the Vuetify app bar.
// Copy + nav come from the shared content via the cache chain (useSiteContent).
const { content } = useSiteContent();

const route = useRoute();
const menuOpen = ref(false);

// Nav items come from the content's menu.
const nav = computed(() =>
  content.value
    ? [content.value.menu.apod, content.value.menu.how, content.value.menu.about]
    : [],
);

// Gallery stays active on detail pages (/apod/:date) too.
const isActive = (to: string) =>
  to === "/apod" ? route.path.startsWith("/apod") : route.path === to;

// Close the mobile menu whenever the route changes.
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
  },
);
</script>

<template>
  <header class="fixed left-1/2 top-0 z-50 w-full max-w-[1920px] -translate-x-1/2">
    <!-- Blurred gradient scrim that fades out downward (no hard edge). -->
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-[140px] backdrop-blur-[11px] bg-[linear-gradient(180deg,rgba(5,5,6,0.62)_0%,rgba(5,5,6,0.26)_46%,transparent_100%)] [mask-image:linear-gradient(180deg,#000_0%,#000_48%,transparent_100%)] [-webkit-mask-image:linear-gradient(180deg,#000_0%,#000_48%,transparent_100%)]"
    />

    <nav
      class="container relative mx-auto flex h-[76px] items-center px-5 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)] md:px-8"
    >
      <NuxtLink
        to="/"
        class="font-serif text-[22px] tracking-[0.01em] text-white"
      >
        {{ content?.header.brand }}
      </NuxtLink>

      <!-- Desktop nav -->
      <div class="ml-auto hidden items-center gap-[30px] text-sm md:flex">
        <NuxtLink
          v-for="item in nav"
          :key="item.link"
          :to="item.link"
          class="transition-colors hover:text-white"
          :class="isActive(item.link) ? 'text-white' : 'text-white/60'"
        >
          {{ item.label }}
        </NuxtLink>
        <a
          :href="content?.header.githubUrl"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1.5 text-white/60 transition-colors hover:text-white"
        >
          {{ content?.header.github }}
        </a>
      </div>

      <!-- Mobile: animated orbit hamburger -->
      <button
        type="button"
        aria-label="Toggle menu"
        :aria-expanded="menuOpen"
        aria-controls="mobile-nav"
        class="ml-auto flex h-[42px] w-[42px] items-center justify-center rounded-[10px] border border-white/[0.18] bg-white/[0.04] text-white backdrop-blur-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        @click="menuOpen = !menuOpen"
      >
        <span v-if="!menuOpen" class="relative block h-[22px] w-[22px]">
          <span
            class="absolute inset-0 rounded-full border border-white/[0.28]"
          />
          <span
            class="absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] h-[6px] w-[6px] rounded-full bg-[#fafafa]"
          />
          <span class="absolute inset-0 animate-[orbit_3.2s_linear_infinite]">
            <span
              class="absolute left-1/2 top-[-2px] -ml-[2.5px] h-[5px] w-[5px] rounded-full bg-tanstack shadow-[0_0_6px_#38bdf8]"
            />
          </span>
        </span>
        <span v-else class="text-[17px] leading-none">✕</span>
      </button>
    </nav>

    <!-- Mobile dropdown menu -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="menuOpen"
        class="absolute inset-x-0 top-[76px] flex flex-col border-b border-white/[0.08] px-5 pb-[18px] pt-2 backdrop-blur-[16px] md:hidden bg-[radial-gradient(1px_1px_at_18%_32%,rgba(255,255,255,0.5),transparent),radial-gradient(1px_1px_at_68%_55%,rgba(255,255,255,0.4),transparent),radial-gradient(1.5px_1.5px_at_42%_78%,rgba(255,255,255,0.32),transparent),radial-gradient(1px_1px_at_85%_24%,rgba(255,255,255,0.35),transparent),rgba(6,6,8,0.97)]"
      >
        <NuxtLink
          v-for="item in nav"
          :key="item.link"
          :to="item.link"
          class="border-b border-white/[0.06] px-1 py-[14px] text-left text-base text-[#fafafa]"
        >
          {{ item.label }}
        </NuxtLink>
        <a
          :href="content?.header.githubUrl"
          target="_blank"
          rel="noopener"
          class="px-1 py-[14px] text-base text-text-secondary"
        >
          {{ content?.header.github }}
        </a>
      </div>
    </Transition>
  </header>
</template>
