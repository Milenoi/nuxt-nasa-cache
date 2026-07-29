import type {ApodDeps} from "#server/apod/ports";
import type {ApodEntry, ApodList} from "#shared/types";
import {detailKey, listKey, listRange, normalizeEntry} from "#server/apod/mapper";

const CACHE_TTL = 86400; // 24h in seconds

// Only image entries need their real pixel size (to reserve the aspect ratio).
// Probe once when it's missing; leave videos/other and failed probes untouched.
const withDimensions = async (entry: ApodEntry, deps: ApodDeps): Promise<ApodEntry> => {
    if (entry.mediaType !== "image" || entry.width) return entry;
    const size = await deps.probe.probeSize(entry.url);
    return size ? {...entry, width: size.width, height: size.height} : entry;
};

// Detail: one day, keyed by date. Cache first, NASA only on a miss.
export const loadApodDetail = async (
    date: string,
    deps: ApodDeps,
): Promise<{ entry: ApodEntry; source: "redis" | "nasa" }> => {
    const key = detailKey(date);

    const cached = await deps.cache.get<ApodEntry>(key);
    if (cached) {
        // List pre-caches entries without dimensions, backfill them once.
        const enriched = await withDimensions(cached, deps);
        if (enriched !== cached) await deps.cache.set(key, enriched, CACHE_TTL);
        return {entry: enriched, source: "redis"};
    }

    const raw = await deps.source.fetchDetail(date);
    const entry = await withDimensions(normalizeEntry(raw), deps);
    await deps.cache.set(key, entry, CACHE_TTL);
    return {entry, source: "nasa"};
};

// List: the last 60 days. On a miss, also pre-cache every entry under its
// detail key, so opening any detail page is a cache hit.
export const loadApodList = async (
    deps: ApodDeps,
    now?: number,
): Promise<{ list: ApodList; source: "redis" | "nasa" }> => {
    const {start, end} = listRange(now);
    const key = listKey(start, end);

    const cached = await deps.cache.get<ApodList>(key);
    if (cached) return {list: cached, source: "redis"};

    const raw = await deps.source.fetchList(start, end);
    const entries = raw.map(normalizeEntry).sort((a, b) => (a.date < b.date ? 1 : -1));
    const list: ApodList = {entries};

    await deps.cache.set(key, list, CACHE_TTL);
    await Promise.all(entries.map((e) => deps.cache.set(detailKey(e.date), e, CACHE_TTL)));

    return {list, source: "nasa"};
};
