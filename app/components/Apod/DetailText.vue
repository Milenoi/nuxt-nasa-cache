<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  dateLabel: string;
  paragraphs: string[];
  copyright?: string | null;
}>();
</script>

<template>
  <div>
    <div class="mb-3 flex items-start justify-between gap-4">
      <span class="text-sm font-medium text-text-secondary">{{ eyebrow }}</span>
      <slot name="aside" />
    </div>
    <h1
      class="m-0 text-balance font-serif text-4xl font-normal tracking-tight md:text-5xl xl:text-6xl"
    >
      {{ title }}
    </h1>
    <p class="mt-3 text-sm text-text-secondary">
      {{ dateLabel }}
    </p>

    <slot name="media" />

    <div class="mt-8 space-y-5">
      <p
        v-for="(para, i) in paragraphs"
        :key="i"
        :class="i === 0
          ? 'font-serif text-xl leading-snug text-text-strong md:text-2xl'
          : 'text-base leading-relaxed text-text-body'"
      >
        {{ para }}
      </p>
    </div>
    <p v-if="copyright" class="mt-8 text-xs text-text-faint">
      © {{ copyright }}
    </p>
  </div>
</template>
