/**
 * Seek a video to a representative preview frame, `fraction` of the way in,
 * past the (often black) opening frame.
 *
 * Used as a `loadedmetadata` handler for APOD videos that have no NASA
 * thumbnail: the forced seek makes the browser decode that frame under
 * `preload="metadata"` so it can serve as the poster.
 *
 * @param {Event} event - the video's `loadedmetadata` event
 * @param {number} fraction - position to seek to, as a fraction of duration
 */
export function seekVideoPreview(event: Event, fraction = 0.25): void {
  const video = event.currentTarget as HTMLVideoElement;
  if (Number.isFinite(video.duration)) video.currentTime = video.duration * fraction;
}
