<script setup lang="ts">
// Copy + SEO come from the shared content via the cache chain.
const { content } = useSiteContent();
const faq = computed(() => content.value?.faq);
const seo = computed(() => content.value?.seo?.faq);

// SEO from the content (twitter:* fall back to og:* set globally in app.vue).
// `social` is the shorter og:description, see the SeoEntry type.
useSeoMeta({
    title: () => seo.value?.title,
    description: () => seo.value?.description,
    ogTitle: () => seo.value?.title,
    ogDescription: () => seo.value?.social,
});

// FAQPage structured data, built from the same items the page renders, so the
// rich result can never describe questions the page does not show. Emitted
// through nuxt-schema-org, which links the questions into the page graph
// instead of dropping a standalone JSON-LD block next to it.
useSchemaBreadcrumb();
useSchemaOrg([
    defineWebPage({
        "@type": "FAQPage",
        name: () => seo.value?.title,
        description: () => seo.value?.description,
    }),
    ...(faq.value?.items ?? []).map((item) =>
        defineQuestion({
            name: item.q,
            acceptedAnswer: item.a,
        }),
    ),
]);
</script>

<template>
  <section
      class="container mx-auto min-h-screen px-5 pb-40 pt-32 md:px-8 animate-[fadeUp_0.4s_ease]"
  >
    <div v-if="faq" class="text-left md:text-center">
      <div class="mb-3 text-sm font-medium tracking-[0.01em] text-text-muted">
        {{ faq.tagline }}
      </div>
      <h1
          class="m-0 mb-5 text-balance font-serif text-[clamp(40px,5.5vw,64px)] font-normal leading-[1.05] tracking-tight md:mx-auto md:max-w-[18ch]"
      >
        {{ faq.heading }}
      </h1>
      <p class="mb-12 max-w-[54ch] text-base leading-relaxed text-text-secondary md:mx-auto">
        {{ faq.lead }}
      </p>

        <!-- One item open at a time, all closed initially: the page should read as
             a list of questions first, not a wall of answers. Left-aligned even
             where the intro is centered, because answers are full sentences. -->
      <UiAccordion
          type="single"
          collapsible
          class="mx-auto max-w-3xl border-t border-white/8 text-left"
      >
        <UiAccordionItem
            v-for="(item, i) in faq.items"
            :key="item.q"
            :value="`q-${i}`"
            class="border-white/7"
        >
          <UiAccordionTrigger
              class="py-5 text-base font-medium text-text-strong hover:no-underline hover:text-foreground"
          >
            {{ item.q }}
          </UiAccordionTrigger>
          <UiAccordionContent
              class="max-w-[68ch] pb-5 text-sm leading-relaxed text-text-secondary"
          >
            {{ item.a }}
            <a
                v-if="item.href"
                :href="item.href"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-3 block text-sm font-medium text-text-muted transition-colors hover:text-foreground"
            >
              {{ faq.docsLabel }}
            </a>
          </UiAccordionContent>
        </UiAccordionItem>
      </UiAccordion>
    </div>
  </section>
</template>
