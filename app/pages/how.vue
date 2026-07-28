<script setup lang="ts">
import {ChevronDown, Code2} from "@lucide/vue";
import codeSnippets from "~/assets/json/code-snippets.json";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Copy + SEO come from the shared content via the cache chain.
const { content } = useSiteContent();
const how = computed(() => content.value?.how);
const seo = computed(() => content.value?.seo?.how);

// SEO from the content (twitter:* fall back to og:* set globally in app.vue).
useSeoMeta({
    title: () => seo.value?.title,
    description: () => seo.value?.description,
    ogTitle: () => seo.value?.title,
    ogDescription: () => seo.value?.description,
});

type StepMeta = {
    img: string;
    nodeBorder: string;
    roleClass: string;
};

// Visual bits per timeline step (order matches the chain, client → origin);
// copy lives in static-text.json.
const stepMeta: StepMeta[] = [
    {img: "/svg/marks/query.svg", nodeBorder: "border-[rgba(56,189,248,0.35)]", roleClass: "text-tanstack"},
    {img: "/svg/marks/nitro.svg", nodeBorder: "border-[rgba(74,222,128,0.35)]", roleClass: "text-nitro"},
    {img: "/svg/marks/redis.svg", nodeBorder: "border-[rgba(248,113,113,0.35)]", roleClass: "text-redis"},
    {img: "/svg/marks/nasa.svg", nodeBorder: "border-white/[0.14]", roleClass: "text-white/65"},
];

type Snippet = { key: string; file: string; html: string };

const steps = computed(() =>
    (how.value?.steps ?? []).map((step, i) => ({
        ...step,
        meta: stepMeta[i] as StepMeta,
        // Real code excerpt for this layer (order matches `how?.steps`).
        snippet: codeSnippets[i] as Snippet | undefined,
    })),
);
</script>

<template>
  <section
      class="container mx-auto min-h-screen px-5 pb-40 pt-32 md:px-8 animate-[fadeUp_0.4s_ease]"
  >
    <div class="text-left md:text-center">
      <div class="mb-3 text-[15px] font-medium tracking-[0.01em] text-text-muted">
        {{ how?.tagline }}
      </div>
      <h1
          class="m-0 mb-5 font-serif text-[clamp(46px,6vw,72px)] font-normal leading-none tracking-tight"
      >
        {{ how?.heading }}
      </h1>
      <p class="mb-12 max-w-[54ch] text-base leading-relaxed text-text-secondary md:mx-auto">
        {{
              how?.leadBefore
          }}<span class="text-text-strong">{{ how?.leadHighlight }}</span
      >{{ how?.leadAfter }}
      </p>

      <ol class="flex max-w-md list-none flex-col text-left md:mx-auto">
        <li v-for="(step, i) in steps" :key="step.name" class="flex gap-5">
          <!-- node + connector -->
          <div class="flex flex-col items-center">
            <div
                class="grid size-12.5 flex-none place-items-center rounded-full border bg-surface-panel"
                :class="step.meta.nodeBorder"
            >
              <img
                  :src="step.meta.img"
                  :width="getMarkSize(step.meta.img).width"
                  :height="getMarkSize(step.meta.img).height"
                  alt=""
                  class="h-4 w-auto"
              >
            </div>
            <div
                v-if="i < steps.length - 1"
                class="my-2.5 w-px flex-1 bg-white/10"
            />
          </div>
            <!-- text -->
          <div class="pb-8">
            <div class="mb-1.5 flex items-center gap-3">
              <span class="text-[17px] font-medium">{{ step.name }}</span>
              <span class="text-[11px]" :class="step.meta.roleClass">
                {{ step.role }}
              </span>
            </div>
            <p
                class="m-0 max-w-[48ch] text-[14.5px] leading-relaxed text-text-secondary"
            >
              {{ step.desc }}
            </p>
            <a
                :href="step.href"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-2 inline-flex items-center text-[13px] font-medium text-text-muted transition-colors hover:text-foreground"
            >
              {{ how?.docsLabel }}
            </a>

              <!-- Real code for this layer, collapsed by default -->
            <Collapsible v-if="step.snippet" v-slot="{ open }" class="group mt-4">
              <CollapsibleTrigger
                  class="inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Code2 class="size-3.5" aria-hidden="true"/>
                <span>{{ open ? how?.codeHide : how?.codeShow }}</span>
                <ChevronDown
                    class="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <figure
                    class="mt-3 overflow-hidden rounded-xl border border-white/8 bg-surface-panel"
                >
                  <figcaption
                      class="flex items-center gap-2 border-b border-white/6 px-4 py-2 font-mono text-[12px] text-text-muted"
                  >
                    <span class="size-1.5 rounded-full bg-white/25"/>
                    {{ step.snippet.file }}
                  </figcaption>
                    <!-- eslint-disable-next-line vue/no-v-html -- Shiki output generated at build time from our own source -->
                  <div class="code-panel overflow-x-auto p-4 text-[13px] leading-relaxed" v-html="step.snippet.html"/>
                </figure>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </li>
      </ol>

        <!-- Usage guide: what the cache controls do -->
      <div class="mt-20 border-t border-white/8 pt-14 text-left md:text-center">
        <h2 class="m-0 font-serif text-[clamp(28px,3.4vw,40px)] font-normal tracking-tight">
          {{ how?.guideHeading }}
        </h2>
        <p class="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-text-secondary md:mx-auto">
          {{ how?.guideLead }}
        </p>

        <div class="mt-10 grid max-w-4xl gap-4 sm:grid-cols-3 md:mx-auto">
          <div
              v-for="tip in how?.guide ?? []"
              :key="tip.title"
              class="rounded-2xl border border-[#17171a] bg-surface-card p-6 text-left"
          >
            <div class="mb-2 text-[15px] font-medium text-foreground">
              {{ tip.title }}
            </div>
            <p class="m-0 text-sm leading-relaxed text-text-secondary">
              {{ tip.desc }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Shiki output is injected via v-html, so reach it with :deep. */
.code-panel :deep(pre.shiki) {
    margin: 0;
    background: transparent !important;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    white-space: pre;
}
</style>
