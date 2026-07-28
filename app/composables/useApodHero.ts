import type { ApodEntry } from "#shared/types";

const ytId = (u: string) =>
  u.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?v=|v\/))([\w-]{11})/)?.[1];
const vimeoId = (u: string) => u.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];

/**
 * Derives the hero's ambient background from the latest APOD entry: a direct
 * video file, a YouTube/Vimeo embed, or an image — plus a representative-frame
 * poster (only when NASA gives a thumbnail) and a reduced-motion-aware autoplay
 * handler. Extracted so index.vue stays about layout, not media plumbing.
 */
export function useApodHero(latestApod: Ref<ApodEntry | null>) {
  const img = useImage();

  // A direct video file plays as the background; embeds fall back to an iframe,
  // images to the image itself.
  const heroEmbed = computed(() =>
    latestApod.value?.mediaType === "video"
      ? getApodEmbed(latestApod.value.url)
      : null,
  );

  const heroVideo = computed(() =>
    heroEmbed.value?.type === "file" ? heroEmbed.value.src : null,
  );

  const heroImage = computed(() => {
    const entry = latestApod.value;
    if (!entry) return "/images/apod.jpg";
    if (entry.mediaType === "image") return entry.hdurl ?? entry.url;
    return entry.thumbnailUrl ?? "/images/apod.jpg";
  });

  // Poster only when NASA actually provides a thumbnail. Its self-hosted .mp4s
  // carry none, so we skip the poster (a generic fallback photo would flash) and
  // let the video paint its own frame; a real thumbnail is sized via the pipeline.
  const heroVideoPoster = computed(() => {
    const thumb = latestApod.value?.thumbnailUrl;
    return thumb
      ? img(thumb, {
          width: 1280,
          height: 720,
          fit: "cover",
          format: "webp",
          quality: 70,
        })
      : undefined;
  });

  // Autoplay, muted, looping background embed for YouTube/Vimeo heroes.
  const heroIframe = computed(() => {
    const e = heroEmbed.value;
    if (e?.type === "youtube") {
      const id = ytId(e.src);
      return id
        ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&playsinline=1&rel=0`
        : null;
    }
    if (e?.type === "vimeo") {
      const id = vimeoId(e.src);
      return id
        ? `https://player.vimeo.com/video/${id}?background=1&autoplay=1&muted=1&loop=1`
        : null;
    }
    return null;
  });

  // Start the ambient video on a representative frame; autoplay only when the
  // user hasn't asked for reduced motion (otherwise the still frame stands in).
  const onHeroLoaded = (event: Event) => {
    seekVideoPreview(event);
    const video = event.currentTarget as HTMLVideoElement;
    const reducedMotion
      = import.meta.client
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedMotion) video.play().catch(() => {});
  };

  return { heroVideo, heroImage, heroVideoPoster, heroIframe, onHeroLoaded };
}
