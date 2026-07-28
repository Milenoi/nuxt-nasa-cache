import { createHash } from "node:crypto";
import type { ContentSource, SiteContent } from "#shared/types";
// The bundled JSON is the origin for site content — the equivalent of NASA for
// the APOD data, except it ships with the app instead of coming over the wire.
import staticText from "../../app/assets/json/static-text.json";

const CACHE_TTL = 86400; // 24h

// Version the cache by a hash of the bundled content, so any edit to the copy
// (a new section, a changed shape) yields a NEW key. That way a stale payload
// with an outdated shape can never be served after a content change — the old
// key is simply orphaned and expires. Without this, adding a section left the
// previous cached payload (missing that section) live for up to CACHE_TTL.
const CONTENT_VERSION = createHash("sha1")
  .update(JSON.stringify(staticText))
  .digest("hex")
  .slice(0, 8);

// Nitro SWR layer (the front server cache): keep data "fresh" only briefly so the
// stale-while-revalidate behaviour is observable, then serve stale up to a day.
const NITRO_MAX_AGE = 30; // seconds a value is considered fresh
const NITRO_STALE_MAX_AGE = CACHE_TTL; // seconds a stale value may still be served

// The payload before the server tags it with a `_source`. `SiteContent._source`
// is already optional, so we reuse the type directly rather than `Omit`-ing it
// (Omit collapses a type that carries an index signature and would drop `about`).
type ContentPayload = SiteContent;

/*
 * The same cache CHAIN as the APOD endpoint, applied to the static UI copy:
 *
 *   Vue Query (client) -> Nitro SWR (server) -> Redis (server) -> JSON (origin)
 *
 * The content never changes at runtime, so this is a showcase rather than a
 * necessity — it demonstrates that any content, not just remote API data, can
 * ride the same layered cache. The `_source` we attach tells the UI which layer
 * actually served this response.
 */
const loadContent = async (): Promise<SiteContent> => {
  // Assume the Nitro layer served it; the inner fn only runs on a Nitro miss and
  // then reports whether Redis or the bundled origin produced the data.
  let servedBy: ContentSource = "nitro";

  const throughRedis = async (): Promise<ContentPayload> => {
    const storage = useStorage("redis");
    const cacheKey = `content:site:${CONTENT_VERSION}`;

    const cached = await storage.getItem<ContentPayload>(cacheKey);
    if (cached) {
      servedBy = "redis";
      return cached;
    }

    servedBy = "origin";
    const content = staticText as ContentPayload;
    await storage.setItem(cacheKey, content, { ttl: CACHE_TTL });
    return content;
  };

  const throughNitro = defineCachedFunction(throughRedis, {
    name: "content-site",
    group: "content-nitro",
    getKey: () => `site:${CONTENT_VERSION}`,
    maxAge: NITRO_MAX_AGE,
    staleMaxAge: NITRO_STALE_MAX_AGE,
    swr: true,
  });

  const content = await throughNitro();
  return { ...content, _source: servedBy };
};

export default defineEventHandler(async (): Promise<SiteContent> => loadContent());
