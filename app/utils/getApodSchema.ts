import type { ApodEntry } from "#shared/types";
import { getApodEmbed } from "./getApodEmbed";

/**
 * Schema.org node builders for APOD entries.
 *
 * Plain functions on purpose: they take an entry and return a plain object, so
 * they can be unit tested without a Nuxt runtime. The pages wrap the result in
 * the module's `defineImage` / `defineVideo` / `defineItemList` helpers.
 *
 * Two rules hold throughout:
 * - A field we have no data for is omitted, never emitted empty or invented.
 * - The media is NASA's, not this site's, so the credit stays on the media node
 *   (`creditText` / `copyrightNotice`) and never touches the site identity.
 */

/** Fallback credit for the ~90% of entries that ship no `copyright`. */
const NASA_CREDIT = "NASA";

/** The public detail URL of an entry, absolute so it survives being embedded. */
function getApodEntryUrl(entry: ApodEntry, siteUrl: string): string {
  return `${siteUrl}/apod/${entry.date}`;
}

/**
 * Build an ImageObject for an APOD image entry.
 *
 * Prefers `hdurl` as `contentUrl` (that is the full-resolution original) and
 * keeps `url` as the displayed representation. `width`/`height` are only set
 * when the server-side probe actually resolved them.
 *
 * Takes no site URL: every field of an ImageObject points at the media itself,
 * which is hosted on apod.nasa.gov.
 *
 * @param {ApodEntry} entry - a normalized APOD entry with `mediaType: "image"`
 * @return {Record<string, unknown>} the ImageObject properties
 */
export function getApodImageNode(entry: ApodEntry): Record<string, unknown> {
  return {
    // Set explicitly: nested media only gets an implicit @type on properties the
    // module knows are images, so `video` would end up untyped.
    "@type": "ImageObject",
    url: entry.url,
    contentUrl: entry.hdurl ?? entry.url,
    caption: entry.title,
    description: entry.explanation,
    datePublished: entry.date,
    creditText: entry.copyright ?? NASA_CREDIT,
    copyrightNotice: entry.copyright ?? NASA_CREDIT,
    ...(entry.width && entry.height
      ? { width: entry.width, height: entry.height }
      : {}),
    ...(entry.thumbnailUrl ? { thumbnailUrl: entry.thumbnailUrl } : {}),
  };
}

/**
 * Build a VideoObject for an APOD video entry.
 *
 * A hosted provider URL (YouTube/Vimeo/other external) is an `embedUrl`; a
 * direct media file is a `contentUrl`. Google treats those differently, so
 * mixing them up is worse than omitting one.
 *
 * @param {ApodEntry} entry - a normalized APOD entry with `mediaType: "video"`
 * @param {string} siteUrl - the canonical site origin, no trailing slash
 * @return {Record<string, unknown>} the VideoObject properties
 */
export function getApodVideoNode(
  entry: ApodEntry,
  siteUrl: string,
): Record<string, unknown> {
  const embed = getApodEmbed(entry.url);

  return {
    "@type": "VideoObject",
    name: entry.title,
    description: entry.explanation,
    uploadDate: entry.date,
    url: getApodEntryUrl(entry, siteUrl),
    ...(embed.type === "file"
      ? { contentUrl: embed.src }
      : { embedUrl: embed.src }),
    ...(entry.thumbnailUrl ? { thumbnailUrl: entry.thumbnailUrl } : {}),
    ...(entry.copyright ? { creditText: entry.copyright } : {}),
  };
}

/**
 * Build the ListItem array for the gallery's ItemList.
 *
 * Positions are 1-based, as the spec requires. Videos contribute their poster
 * as `image` (the entry `url` is a player URL, not an image).
 *
 * @param {ApodEntry[]} entries - the entries the collection describes
 * @param {string} siteUrl - the canonical site origin, no trailing slash
 * @return {Record<string, unknown>[]} one ListItem per entry
 */
export function getApodListItems(
  entries: ApodEntry[],
  siteUrl: string,
): Record<string, unknown>[] {
  return entries.map((entry, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: entry.title,
    url: getApodEntryUrl(entry, siteUrl),
    ...(entry.mediaType === "image"
      ? { image: entry.url }
      : entry.thumbnailUrl
        ? { image: entry.thumbnailUrl }
        : {}),
  }));
}
