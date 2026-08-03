import type { ApodEntry } from "#shared/types";

// The size every social crawler asks for. Routing the NASA asset through the
// image pipeline into exactly this box is what makes the numbers honest: NASA
// sends no dimensions and the server-side probe returns null in production, so
// linking the file directly would mean guessing og:image:width/height.
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/**
 * og:image + og:image:alt for one APOD entry, falling back to the static card.
 */
// MaybeRefOrGetter, because the callers hold three different shapes: the list
// query's `Ref<T | undefined>`, a computed over it, and a plain entry.
export function useApodOgImage(
  entry: MaybeRefOrGetter<ApodEntry | null | undefined>,
) {
  const { siteUrl, socialImageAlt } = useRuntimeConfig().public;
  const img = useImage();

  // A video `url` is a player, not an image, so NASA's thumbnail stands in.
  // Its self-hosted .mp4s carry none, those keep the static card.
  const source = computed(() => {
    const value = toValue(entry);
    if (!value) return null;
    return value.mediaType === "image" ? value.url : value.thumbnailUrl;
  });

  const ogImage = computed(() => {
    const src = source.value;
    if (!src) return `${siteUrl}/og-image.jpg`;

    // JPEG on purpose: the module default negotiates AVIF/WebP, which not every
    // crawler decodes, and a preview it cannot decode is no preview at all.
    const transformed = img(src, {
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      fit: "cover",
      format: "jpg",
      quality: 80,
    });

    // Crawlers have no base to resolve against, og:image must be absolute.
    return transformed.startsWith("http")
      ? transformed
      : `${siteUrl}${transformed}`;
  });

  // Tied to `source`, not to the entry: on a fallback the card shows the nebula,
  // so an entry title there would describe an image nobody is looking at.
  const ogImageAlt = computed(() =>
    source.value ? (toValue(entry)?.title ?? socialImageAlt) : socialImageAlt,
  );

  return { ogImage, ogImageAlt };
}
