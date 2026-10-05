import type { ApodEmbed } from "#shared/types";

/**
 * Classify an APOD video URL so the detail view can pick the right player.
 *
 * APOD video entries are either an embeddable provider URL (YouTube/Vimeo) or a
 * direct media file hosted on assets.science.nasa.gov.
 *
 * @param {string} url - the APOD `url` field of a video entry
 * @return {ApodEmbed} the resolved embed type and source
 */
export function getApodEmbed(url: string): ApodEmbed {
  if (/(?:youtube\.com|youtu\.be)/i.test(url)) {
    return { type: "youtube", src: url };
  }

  if (/vimeo\.com/i.test(url)) {
    return { type: "vimeo", src: url };
  }

  if (/\.(mp4|webm|ogv)(\?.*)?$/i.test(url)) {
    return { type: "file", src: url };
  }

  return { type: "external", src: url };
}
