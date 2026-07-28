<script setup lang="ts">
import { ArrowLeft } from "@lucide/vue";
import { errorPage } from "~/assets/json/static-text.json";

defineProps<{
  error: { statusCode?: number; message?: string };
}>();

const handleClearError = () => clearError({ redirect: "/" });
</script>

<template>
  <div
    class="relative mx-auto flex min-h-screen max-w-[1920px] flex-col overflow-hidden bg-background text-foreground"
  >
    <!-- Starfield backdrop -->
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(1px_1px_at_20%_30%,rgba(255,255,255,0.5),transparent),radial-gradient(1px_1px_at_70%_60%,rgba(255,255,255,0.4),transparent),radial-gradient(1.5px_1.5px_at_40%_78%,rgba(255,255,255,0.35),transparent),radial-gradient(1px_1px_at_85%_22%,rgba(255,255,255,0.4),transparent),radial-gradient(1px_1px_at_10%_68%,rgba(255,255,255,0.3),transparent),radial-gradient(2px_2px_at_60%_14%,rgba(255,255,255,0.35),transparent),radial-gradient(1px_1px_at_33%_12%,rgba(255,255,255,0.4),transparent),radial-gradient(1px_1px_at_52%_44%,rgba(255,255,255,0.3),transparent),radial-gradient(1.5px_1.5px_at_78%_82%,rgba(255,255,255,0.35),transparent),radial-gradient(1px_1px_at_5%_45%,rgba(255,255,255,0.35),transparent),radial-gradient(1px_1px_at_92%_50%,rgba(255,255,255,0.3),transparent),radial-gradient(1px_1px_at_46%_92%,rgba(255,255,255,0.3),transparent),radial-gradient(2px_2px_at_25%_58%,rgba(255,255,255,0.3),transparent),radial-gradient(1px_1px_at_65%_28%,rgba(255,255,255,0.4),transparent),radial-gradient(1px_1px_at_88%_74%,rgba(255,255,255,0.3),transparent),radial-gradient(1px_1px_at_14%_88%,rgba(255,255,255,0.35),transparent)]"
    />
    <span class="pointer-events-none absolute left-[16%] top-[28%] h-1 w-1 rounded-full bg-white [animation:twinkle_2s_ease-in-out_infinite]" />
    <span class="pointer-events-none absolute right-[20%] top-[34%] h-1 w-1 rounded-full bg-white [animation:twinkle_2.6s_ease-in-out_infinite]" />
    <span class="pointer-events-none absolute left-[30%] bottom-[26%] h-[3px] w-[3px] rounded-full bg-white [animation:twinkle_1.8s_ease-in-out_infinite]" />
    <span class="pointer-events-none absolute right-[28%] bottom-[32%] h-1 w-1 rounded-full bg-tanstack [animation:twinkle_2.2s_ease-in-out_infinite]" style="box-shadow: 0 0 6px #38bdf8" />
    <span class="pointer-events-none absolute left-[46%] top-[18%] h-[3px] w-[3px] rounded-full bg-white [animation:twinkle_2.4s_ease-in-out_infinite]" />
    <span class="pointer-events-none absolute left-[8%] top-[52%] h-1 w-1 rounded-full bg-white [animation:twinkle_3s_ease-in-out_infinite]" />
    <span class="pointer-events-none absolute right-[12%] top-[58%] h-[3px] w-[3px] rounded-full bg-white [animation:twinkle_1.6s_ease-in-out_infinite]" />
    <span class="pointer-events-none absolute left-[62%] bottom-[18%] h-1 w-1 rounded-full bg-white [animation:twinkle_2.8s_ease-in-out_infinite]" />
    <span class="pointer-events-none absolute right-[40%] top-[22%] h-1 w-1 rounded-full bg-redis [animation:twinkle_2.1s_ease-in-out_infinite]" style="box-shadow: 0 0 6px #f87171" />
    <span class="pointer-events-none absolute left-[22%] top-[70%] h-1 w-1 rounded-full bg-white [animation:twinkle_2.3s_ease-in-out_infinite]" />

    <!-- USS Enterprise flies across, warp speed -->
    <div class="pointer-events-none absolute left-0 top-[38%] z-0 [animation:flyacross_8s_cubic-bezier(0.55,0,1,0.45)_infinite]">
      <svg
        viewBox="0 0 120 60"
        class="h-10 w-auto rotate-[14deg] text-white/85 drop-shadow-[0_0_10px_rgba(56,189,248,0.75)] drop-shadow-[0_0_20px_rgba(248,113,113,0.5)]"
        fill="currentColor"
        aria-hidden="true"
      >
        <!-- warp nacelles (glowing blue) -->
        <rect x="6" y="10" width="42" height="6" rx="3" fill="#38bdf8" />
        <rect x="6" y="44" width="42" height="6" rx="3" fill="#38bdf8" />
        <!-- bussard collectors (red, leading edge) -->
        <circle cx="47" cy="13" r="3.4" fill="#f87171" />
        <circle cx="47" cy="47" r="3.4" fill="#f87171" />
        <!-- pylons -->
        <path d="M48 30 L30 15 M48 30 L30 45" stroke="currentColor" stroke-width="3" fill="none" />
        <!-- engineering hull -->
        <ellipse cx="54" cy="30" rx="22" ry="6" />
        <!-- neck -->
        <path d="M72 27 L88 24 L88 36 L72 33 Z" />
        <!-- saucer (large, flat — TNG) -->
        <ellipse cx="99" cy="30" rx="21" ry="10" />
      </svg>
    </div>

    <LayoutSiteHeader />

    <main class="relative z-10 flex flex-1 items-center justify-center px-5 text-center">
      <div>
        <p class="mb-4 text-sm font-medium tracking-[0.01em] text-text-muted">
          {{ errorPage.eyebrow }}
        </p>
        <h1
          class="m-0 font-serif text-[clamp(80px,20vw,260px)] leading-none tracking-tight [animation:float_6s_ease-in-out_infinite]"
        >
          {{ error?.statusCode ?? 500 }}
        </h1>
        <p class="mx-auto mt-4 max-w-[48ch] text-text-secondary">
          {{ error?.message }}
        </p>
        <button
          type="button"
          class="mt-8 inline-flex items-center gap-2 rounded-lg border border-white/16 bg-white/3 px-5 py-3 text-sm font-medium transition-colors hover:border-white/30 hover:bg-white/9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          @click="handleClearError"
        >
          <ArrowLeft class="h-4 w-4" />
          {{ errorPage.backHome }}
        </button>
      </div>
    </main>
  </div>
</template>
