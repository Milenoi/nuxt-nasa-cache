import {describe, expect, it} from "vitest";
import {loadApodDetail, loadApodList} from "#server/apod/usecases";
import type {ApodDeps} from "#server/apod/ports";
import type {ApodApiEntry} from "#server/utils/apodSchema";
import type {ApodEntry} from "#shared/types";

// Fake CachePort backed by a plain Map, the whole point: no Redis needed.
const makeCache = () => {
    const store = new Map<string, unknown>();
    return {
        store,
        get: async <T>(key: string): Promise<T | null> =>
            store.has(key) ? (store.get(key) as T) : null,
        set: async <T>(key: string, value: T): Promise<void> => {
            store.set(key, value);
        },
    };
};

// A raw NASA image entry, the shape the source port returns.
const rawImage = (date: string): ApodApiEntry => ({
    date,
    title: `Picture ${date}`,
    explanation: "An explanation.",
    media_type: "image",
    url: `https://apod.nasa.gov/${date}.jpg`,
});

// A fully-formed domain entry, for pre-seeding the cache (video -> skips probe).
const cachedEntry = (over: Partial<ApodEntry> = {}): ApodEntry => ({
    date: "2026-07-01", title: "Cached", explanation: "E", mediaType: "video",
    url: "u", hdurl: null, thumbnailUrl: null, copyright: null,
    formattedDate: "Jul 1, 2026", width: null, height: null, ...over,
});

describe("loadApodDetail", () => {
    it("returns a cached entry without hitting the source", async () => {
        const cache = makeCache();
        cache.store.set("apod:detail:2026-07-01", cachedEntry());
        let sourceCalls = 0;
        const deps: ApodDeps = {
            cache,
            source: {
                fetchDetail: async (d) => {
                    sourceCalls++;
                    return rawImage(d);
                }, fetchList: async () => []
            },
            probe: {probeSize: async () => null},
        };

        const {entry, source} = await loadApodDetail("2026-07-01", deps);

        expect(source).toBe("redis");
        expect(sourceCalls).toBe(0);
        expect(entry.title).toBe("Cached");
    });

    it("fetches from the source on a miss and caches the result", async () => {
        const cache = makeCache();
        let sourceCalls = 0;
        const deps: ApodDeps = {
            cache,
            source: {
                fetchDetail: async (d) => {
                    sourceCalls++;
                    return rawImage(d);
                }, fetchList: async () => []
            },
            probe: {probeSize: async () => null},
        };

        const {entry, source} = await loadApodDetail("2026-07-02", deps);

        expect(source).toBe("nasa");
        expect(sourceCalls).toBe(1);
        expect(entry.title).toBe("Picture 2026-07-02");
        expect(cache.store.get("apod:detail:2026-07-02")).toBeTruthy();
    });

    it("backfills image dimensions from the probe", async () => {
        const cache = makeCache();
        const deps: ApodDeps = {
            cache,
            source: {fetchDetail: async (d) => rawImage(d), fetchList: async () => []},
            probe: {probeSize: async () => ({width: 1200, height: 800})},
        };

        const {entry} = await loadApodDetail("2026-07-03", deps);

        expect(entry.width).toBe(1200);
        expect(entry.height).toBe(800);
    });
});

describe("loadApodList", () => {
    const now = Date.parse("2026-07-27T00:00:00Z");

    it("sorts newest-first and pre-caches every entry under its detail key", async () => {
        const cache = makeCache();
        const dates = ["2026-07-01", "2026-07-02", "2026-07-03"];
        const deps: ApodDeps = {
            cache,
            source: {fetchDetail: async (d) => rawImage(d), fetchList: async () => dates.map(rawImage)},
            probe: {probeSize: async () => null},
        };

        const {list, source} = await loadApodList(deps, now);

        expect(source).toBe("nasa");
        expect(list.entries).toHaveLength(3);
        expect(list.entries[0]?.date).toBe("2026-07-03"); // newest first
        for (const d of dates) {
            expect(cache.store.get(`apod:detail:${d}`)).toBeTruthy();
        }
        expect([...cache.store.keys()].some((k) => k.startsWith("apod:list:"))).toBe(true);
    });

    it("returns the cached list on a second call without hitting the source", async () => {
        const cache = makeCache();
        let listCalls = 0;
        const deps: ApodDeps = {
            cache,
            source: {
                fetchDetail: async (d) => rawImage(d), fetchList: async () => {
                    listCalls++;
                    return [];
                }
            },
            probe: {probeSize: async () => null},
        };

        await loadApodList(deps, now);          // fills the cache
        const {source} = await loadApodList(deps, now); // must be a hit

        expect(source).toBe("redis");
        expect(listCalls).toBe(1); // source called only once
    });
});
