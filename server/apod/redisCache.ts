import type {CachePort} from "#server/apod/ports";

// The persistent server cache: Nitro's Redis storage driver behind the port.
export const redisCache: CachePort = {
    get: async <T>(key: string): Promise<T | null> =>
        (await useStorage("redis").getItem<T>(key)) ?? null,
    set: async <T>(key: string, value: T, ttlSeconds: number): Promise<void> => {
        await useStorage("redis").setItem(key, value as never, {ttl: ttlSeconds});
    },
};
