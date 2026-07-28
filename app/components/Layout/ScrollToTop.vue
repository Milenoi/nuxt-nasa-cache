<script setup lang="ts">
import { ArrowUp } from "@lucide/vue";

const route = useRoute();
const visible = ref(false);

const onScroll = () => {
  visible.value = window.scrollY > 400;
};

onMounted(() => window.addEventListener("scroll", onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener("scroll", onScroll));

const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

// Hidden on the full-bleed home hero.
const enabled = computed(() => route.path !== "/");
</script>

<template>
  <ClientOnly>
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-2 opacity-0"
    >
      <button
        v-if="enabled && visible"
        type="button"
        aria-label="Scroll to top"
        class="fixed bottom-[84px] right-5 z-50 grid size-11 place-items-center rounded-full border border-white/14 bg-surface-glass text-foreground backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:right-8"
        @click="scrollTop"
      >
        <ArrowUp class="h-5 w-5" />
      </button>
    </Transition>
  </ClientOnly>
</template>
