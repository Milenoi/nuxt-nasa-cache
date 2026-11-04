# CLAUDE.md

Guidance for Claude Code in this repository. Only what is not obvious from the code.

## What this is

Nuxt 4 demo for **multi-layer caching**. NASA APOD data is validated on the server,
cached in Redis (24h), and cached again on the client by TanStack Vue Query. Dark-only
editorial UI with shadcn-vue and Tailwind v4. Live: https://nuxt-cache-project.netlify.app/

The chain is a teaching device, not a blueprint. It caches **data**, not rendered HTML.

Sibling of `nuxt-nasa-rag`; both share a visual language and link to each other.

## Commands

```bash
npm run dev        # dev server on http://localhost:3000
npm test           # vitest
npm run typecheck  # nuxt typecheck (vue-tsc), ~30s
npm run lint       # eslint --fix
npm run build      # production build, regenerates the code snippets first
```

## Hard rules

- **npm**, Node from `.nvmrc` (run `nvm use` first). `.npmrc` holds back releases
  younger than three days.
- Never commit or push without being asked.
- Never commit secrets, they belong in `.env` (git-ignored).
- New UI primitives come from shadcn-vue (New York style), styled with Tailwind
  utilities and the tokens in `app/assets/css/tailwind.css`.
- Static UI copy is centralized in `app/assets/json/static-text.json`, not inline.

## Import aliases, the non-obvious part

The project uses the Nuxt 4 `app/` structure, so **`~` and `@` resolve to `app/`**, not
to the project root.

- Types shared between app and server: `#shared/types` (not `~/types`)
- Server-internal imports: `#server/...`

## Data source, the API that broke

APOD moved from apod.nasa.gov to science.nasa.gov at the end of September 2026. The
legacy `api.nasa.gov/planetary/apod` still answers 200 but returns the NASA logo for
every date. The origin is now `science.nasa.gov/wp-json/wp/v2/apod-basic`, no API key.
Its quirks, all handled in `server/apod/mapper.ts`:

- `url` is the **article link**, not the media. The real image, `.mp4` or YouTube
  embed is the first `<img>`/`<source>`/`<iframe>` in `basic_html`.
- An `hdurl` containing `cosmic-origins/images/misc/news-thumbnail` is NASA's generic
  placeholder, not the APOD. It shows up on much of the early archive and on video days.
- Text fields are HTML. `copyright` holds every credit: a label without "Copyright"
  ("Image Credit: NASA") means public domain and maps to null, like the old API.
- Dates are `yymmdd`, a page holds at most 25 entries (`per_page` above that is ignored).

## Caching behaviour worth knowing

- The **list** endpoint pre-caches every single entry under its own
  `apod:detail:<date>` key. Opening any detail page is therefore a cache hit, not a
  second NASA request.
- Cached payloads carry a `redis: "true"` flag. The UI reads it to decide whether the
  cache-source badge says Redis or NASA. Do not drop it when touching the payload shape.
- `clear-redis-cache.post.ts` is **POST only on purpose**, so a GET prefetch or a crawler
  cannot wipe the cache. It clears only the `apod:` namespace, never the whole Redis.
- A failed NASA response is never cached.
- Vue Query defaults (`app/plugins/vue-query.ts`): 24h staleTime, no refetch on mount or
  focus, 2 retries.

## Two traps that cost real time

**Image `sizes` must be explicit px per breakpoint. Never a bare `vw` value.** A `vw`
value does not resolve against the `screens` ladder, collapses the srcset to a single
candidate, and every device downloads the widest variant.

The `screens` in `app/utils/getImageConfig.ts` are **exactly Tailwind's breakpoints**.
Nuxt emits `max-width`, Tailwind uses `min-width`, and since `@nuxt/image` 2.1 the module
subtracts the 1px itself. Up to 2.0 the ladder had to be written as 639/767/1023 by hand;
keeping that after the upgrade subtracts the pixel twice.

**The cache pills on `/` can lie.** `routeRules` give `/`, `/about` and `/how` a CDN
cache-control header, while the APOD routes send none. On a warm CDN hit the pills on `/`
are as old as the cached copy, up to an hour. Fine for a demo, because any in-app
navigation refetches through `/api/apod`.

## Meta tags and share cards

`SeoEntry` carries **two** description strings and they are not interchangeable:
`description` is written for the SERP window (120 to 160 characters), `social` for
`og:description`, which a mobile share card cuts around 125. One string reused for both
is always wrong for one of the two. The defaults for pages without their own entry sit in
`nuxt.config.ts` as `site.description` (SERP) and `social` (share card).

`og:image` is the APOD entry, not a fixed graphic: today's entry on `/` and `/apod`, that
day's entry on a detail page. `useApodOgImage` routes it through the image pipeline into a
fixed 1200x630 JPEG for two reasons. Not every entry's CDN URL carries its size and the
server-side probe returns null in production, so `og:image:width/height` would otherwise
be a guess, and the negotiated AVIF/WebP is not decoded by every crawler. Entries with no
image at all (videos without a NASA snapshot) fall back to `public/og-image.jpg`, and
`og:image:alt` falls back with them, otherwise the alt text would describe an image nobody
is shown.

Known limit: a YouTube entry without a NASA snapshot falls back to YouTube's 480x360
thumbnail, so its card is upscaled.

## Structured data rules

`nuxt-schema-org` renders one graph per page during SSR, `schemaOrg.reactive` stays off.
The `Person` identity is configured once in `nuxt.config.ts` under `schemaOrg.identity`.

Three things to respect when editing:

- **Always pass `name` and `description` explicitly to `defineWebPage`.** Without them
  the module falls back to the site description and every page describes itself
  identically.
- **Nested media needs an explicit `"@type"`.** The module only infers it for properties
  it already knows are images, so a video node ends up untyped.
- **The gallery `ItemList` describes all entries, not the `?type=` filtered ones.** The
  canonical URL drops the query, so a filtered list would make the same canonical page
  claim different things depending on which URL was crawled.

In `getApodSchema.ts`: a field without data is omitted, never emitted empty. The media
credit (`entry.copyright`, fallback NASA) belongs on the media node, never on the site
identity.

## Environment

Server-only `runtimeConfig`, never `runtimeConfig.public`:

`NUXT_REDIS_HOST`, `NUXT_REDIS_PORT`, `NUXT_REDIS_USERNAME`,
`NUXT_REDIS_PASSWORD`

Remote image domains are allowlisted twice, in `app/utils/getImageConfig.ts` for dev and
in `netlify.toml` for prod: `assets.science.nasa.gov`, `img.youtube.com`, `i.ytimg.com`. Keep both
in sync.

## CI

Husky runs the fast checks pre-commit (lint-staged ESLint on staged files + `npm test`)
and the slow one pre-push (`npm run typecheck`, ~30s, too slow per commit). GitHub Actions
runs the full chain again (`lint -> typecheck -> test -> build`), Netlify builds with
`npm test && npm run build`.

## Code style

- Comments and commits in English, Conventional Commits (`feat(scope): ...`).
- No emojis in code or commits.
- Comments explain why, not what.
