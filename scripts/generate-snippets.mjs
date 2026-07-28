// Build-time syntax highlighting for the "How it works" code samples.
//
// Curated, faithful excerpts of the real cache-chain code (one per layer) are
// highlighted with Shiki here and written to app/assets/json/code-snippets.json as
// ready-made HTML. The page renders that HTML directly, so Shiki never ships to
// the client and there is no SSR cost. Re-run with `yarn snippets` whenever the
// source excerpts below change (this also runs automatically before a build).

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { codeToHtml } from "shiki";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = resolve(__dirname, "../app/assets/json/code-snippets.json");
const THEME = "vitesse-dark";

// Order matches `how.steps` in static-text.json: Vue Query -> Nitro -> Redis -> NASA.
const snippets = [
  {
    key: "vue-query",
    file: "plugins/vue-query.ts",
    code: `// The client cache: TanStack Vue Query, SSR-safe.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 24 * 60 * 60 * 1000, // 24h — a repeat view never refetches
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

// The server dehydrates the cache into the Nuxt payload; the client hydrates
// from it — so there is no duplicate fetch right after hydration.
if (import.meta.server) {
  nuxt.hooks.hook("app:rendered", () => {
    vueQueryState.value = dehydrate(queryClient);
  });
}
if (import.meta.client) hydrate(queryClient, vueQueryState.value);`,
  },
  {
    key: "nitro",
    file: "server/api/apod.get.ts",
    code: `// The Nitro layer wraps the use-case in an in-process, stale-while-revalidate
// cache. A warm hit never leaves the server process — beating the Redis hop.
const throughNitro = defineCachedFunction(
  async (d: string): Promise<ApodEntry> => {
    const { entry, source } = await loadApodDetail(d, deps);
    servedBy = source; // only runs on a Nitro miss
    return entry;
  },
  {
    name: "apod-detail",
    getKey: (d: string) => d,
    maxAge: 30,          // fresh for 30s — answers directly
    staleMaxAge: 86400,  // then serves the stale value instantly...
    swr: true,           // ...and refreshes in the background, no request waits
  },
);
const entry = await throughNitro(date);`,
  },
  {
    key: "redis",
    file: "server/apod/usecases.ts",
    code: `// Redis sits behind the CachePort: a persistent, shared cache-aside store
// (24h TTL). The use-case talks only to the port — Redis is an injected adapter,
// so this exact logic runs against a plain Map in the unit tests.
export const loadApodDetail = async (date: string, deps: ApodDeps) => {
  const cached = await deps.cache.get<ApodEntry>(detailKey(date));
  if (cached) return { entry: cached, source: "redis" }; // hit: no NASA call

  // miss: fall through to the origin, normalize, then backfill the cache
  const raw = await deps.source.fetchDetail(date);
  const entry = await withDimensions(normalizeEntry(raw), deps);
  await deps.cache.set(detailKey(date), entry, CACHE_TTL);
  return { entry, source: "nasa" };
};`,
  },
  {
    key: "nasa",
    file: "server/apod/nasaSource.ts",
    code: `// The origin: NASA's APOD API — rate-limited and slow, so it is the last
// resort. The response is validated before anything downstream trusts it.
const fetchFromNasa = async <T>(url: string, schema: ZodType<T>): Promise<T> => {
  try {
    // Zod validates the upstream shape; a mismatch throws instead of
    // silently caching bad data.
    return schema.parse(await $fetch(url));
  } catch (error) {
    const status = (error as { status?: number }).status ?? 502;
    // A failed response is never cached, so a transient outage can't poison
    // the cache.
    throw createError({ statusCode: status, statusMessage: "…" });
  }
};`,
  },
];

const highlight = async (code) => {
  const html = await codeToHtml(code, { lang: "ts", theme: THEME });
  // Drop Shiki's inline background so the surrounding panel controls it.
  return html.replace(/background-color:[^;"]+;?/, "");
};

const out = await Promise.all(
  snippets.map(async ({ key, file, code }) => ({
    key,
    file,
    html: await highlight(code),
  })),
);

await mkdir(dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log(`Wrote ${out.length} highlighted snippets to ${OUT_FILE}`);
