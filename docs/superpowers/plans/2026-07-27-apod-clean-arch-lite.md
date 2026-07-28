# APOD Clean-Arch-lite — Tutor-Leitfaden

> **Modus:** Du schreibst den Code, ich (Claude) bin Tutor. Nach jeder Aufgabe:
> committen und mir zeigen — ich reviewe, bevor es weitergeht. Ich gebe dir die
> Verträge (Interfaces) und das Warum; die Implementierung schreibst du.

**Ziel:** Die Server-Cache-Logik in `server/api/apod.get.ts` in einen
framework-agnostischen Kern (pure Use-Cases + Ports) und austauschbare Adapter
(NASA, Redis, Image-Probe) trennen — ohne Verhaltens- oder API-Änderung.

**Warum überhaupt (der Lern-Kern):** Clean Architecture dreht die
Abhängigkeitsrichtung um. Heute ruft deine Logik direkt `useStorage("redis")`
und `$fetch` — sie *hängt an* der Infrastruktur. Nach dem Refactoring hängt die
Infrastruktur an der Logik: der Kern definiert *Interfaces* (Ports), die Adapter
*erfüllen* sie. Analogie: Dein Kern sagt „ich brauche irgendeinen Stromanschluss
(Port)", statt „ich brauche genau diese Steckdose in dieser Wand". Dadurch kannst
du im Test eine Attrappe einstecken (Map statt Redis) und die Logik ohne echte
Infrastruktur prüfen.

**Tech:** Nuxt 4.5 (Nitro server), TypeScript strict, Zod, Vitest. Yarn 4, Node 24
(`nvm use`). Server-interne Imports über `#server/...`, Entities über `#shared/types`.

## Globale Regeln (aus dem Projekt)
- Keine Verhaltens-/API-Änderung: `/api/apod` verhält sich danach identisch.
- Die 4-Schicht-Kette bleibt: Nitro-SWR → Redis → NASA (+ `_source`-Badge).
- Kommentare/Commits auf Englisch, keine Emojis.
- Nach jedem Schritt: `yarn lint` + `yarn typecheck` grün, dann committen.

## Zielstruktur
```
server/apod/
  ports.ts      # Interfaces (der Vertrag)
  mapper.ts     # PURE: normalizeEntry, toMediaType, listRange, cacheKeys
  usecases.ts   # PURE: loadApodList, loadApodDetail (Ports injiziert)
  nasaSource.ts # ApodSourcePort-Impl
  redisCache.ts # CachePort-Impl
  imageProbe.ts # MediaProbePort-Impl
server/api/apod.get.ts  # dünn: Query, Nitro-SWR, DI, Error-Mapping
test/apod/usecases.test.ts
```

## Der Vertrag (gebe ich dir vor — das ist das Design)
```ts
// server/apod/ports.ts
import type { ApodApiEntry } from "#server/apod/nasaSource"; // oder wo das Roh-Type wohnt

export interface CachePort {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T, ttlSeconds: number) => Promise<void>;
}
export interface ApodSourcePort {
  fetchList: (start: string, end: string) => Promise<ApodApiEntry[]>;
  fetchDetail: (date: string) => Promise<ApodApiEntry>;
}
export interface MediaProbePort {
  probeSize: (url: string) => Promise<{ width: number; height: number } | null>;
}
export interface ApodDeps {
  cache: CachePort;
  source: ApodSourcePort;
  probe: MediaProbePort;
}
```

---

## Aufgaben (in dieser Reihenfolge)

### Aufgabe 1 — Ports definieren
- Lege `server/apod/ports.ts` mit obigen Interfaces an.
- **Konzept:** Ports sind reine Typen, kein Import von `nitropack`, `ofetch`,
  `useStorage`. Wenn dir hier ein Framework-Import unterläuft, ist die Grenze
  verletzt. Faustregel: `ports.ts` darf nur `#shared/types` und das Roh-API-Type
  importieren.
- **Checkpoint:** committen, mir zeigen.

### Aufgabe 2 — Reinen Kern (`mapper.ts`) herauslösen
- Verschiebe aus `apod.get.ts` hierher, **unverändert in der Logik**:
  `toMediaType`, `normalizeEntry`, `listRange`, `toIsoDate` — plus zwei neue
  Helfer `listKey(start,end)` und `detailKey(date)` für die Cache-Keys.
- **Konzept:** „Pure" heißt: gleiche Eingabe → gleiche Ausgabe, keine
  Seiteneffekte, kein `useStorage`/`$fetch`/`Date.now` versteckt drin.
  `listRange` nutzt `Date.now()` — das ist ein Seiteneffekt. **Frag dich:** soll
  `now` reingereicht werden? (Tipp: für die Übung ja — mach `listRange(now = Date.now())`,
  dann ist es testbar. Wir sprechen im Review drüber.)
- **Checkpoint:** committen, mir zeigen. Ich prüfe, ob wirklich alles pur ist.

### Aufgabe 3 — Use-Cases mit TDD (das Herzstück)
Hier lernst du am meisten. Reihenfolge strikt test-first.
- **Erst der Test** `test/apod/usecases.test.ts`. Ich gebe dir *einen* Testfall
  als Vorlage, den Rest schreibst du:

  ```ts
  import { describe, it, expect } from "vitest";
  import { loadApodDetail } from "#server/apod/usecases";
  import type { ApodDeps } from "#server/apod/ports";

  // Ein In-Memory-Cache als CachePort-Attrappe:
  const makeCache = () => {
    const store = new Map<string, unknown>();
    return {
      store,
      get: async <T>(k: string) => (store.get(k) ?? null) as T | null,
      set: async <T>(k: string, v: T) => void store.set(k, v),
    };
  };

  it("returns a cached detail from the cache without hitting the source", async () => {
    const cache = makeCache();
    cache.store.set("apod:detail:2026-07-01", { date: "2026-07-01", title: "X" /* … */ });
    let sourceCalls = 0;
    const deps = {
      cache,
      source: { fetchDetail: async () => { sourceCalls++; return {} as never; }, fetchList: async () => [] },
      probe: { probeSize: async () => null },
    } as unknown as ApodDeps;

    const { entry, source } = await loadApodDetail("2026-07-01", deps);

    expect(source).toBe("redis");
    expect(sourceCalls).toBe(0);
    expect(entry.title).toBe("X");
  });
  ```
- **Dann** `loadApodDetail` + `loadApodList` in `usecases.ts` implementieren,
  bis die Tests grün sind. Die Algorithmik kennst du schon aus `apod.get.ts`
  (Cache-Lookup → Miss → Source → normalize → set; Liste cached zusätzlich jeden
  Detail-Key vor).
- **Deine Tests (mind. diese Szenarien):**
  1. Cache-Hit → Quelle wird NICHT gerufen, `source === "redis"`.
  2. Cache-Miss → Quelle wird gerufen, Ergebnis wird gecached, `source === "nasa"`.
  3. Liste-Miss → jeder Eintrag wird zusätzlich unter `detailKey` vorgecached.
  4. (Kür) Detail-Bild ohne Dimensionen → `probe.probeSize` wird gerufen und
     die Maße werden nachgetragen.
- **Konzept:** Du testest jetzt Geschäftslogik ohne Redis und ohne NASA. Genau
  das war vorher unmöglich. Das ist der ganze Payoff — spür den Unterschied.
- **Run:** `yarn test`. **Checkpoint:** committen, mir zeigen.

### Aufgabe 4 — Adapter schreiben
- `nasaSource.ts`: erfüllt `ApodSourcePort`. Zieht `getApodApi` (URL-Bau) und
  `fetchFromNasa` (`$fetch` + Zod-`parse` + Error→HTTP) hier rein. Das Roh-Type
  `ApodApiEntry` + die Zod-Schemas wohnen hier (oder bleiben in `utils/apodSchema.ts`
  und werden importiert — deine Wahl, begründe sie mir).
- `redisCache.ts`: erfüllt `CachePort` über `useStorage("redis")`. `set` mappt
  `ttlSeconds` auf `{ ttl }`.
- `imageProbe.ts`: erfüllt `MediaProbePort` über den bestehenden `getImageSize`.
- **Konzept:** Adapter dürfen Framework kennen — das ist ihr Job. Sie sind die
  „Steckdosen", die den Port erfüllen.
- **Checkpoint:** committen, mir zeigen.

### Aufgabe 5 — Route verdrahten (DI + Nitro + `_source`)
- `apod.get.ts` wird dünn: Query lesen/validieren, Adapter instanziieren,
  `defineCachedFunction` (Nitro-SWR) um den Use-Case legen, `_source`
  bestimmen, Response bauen.
- **Konzept & Stolperstein:** Das `_source`-Badge. Der Use-Case liefert
  `"redis" | "nasa"`. Der Nitro-Wrapper muss bei einem *Warm-Hit* `"nitro"`
  melden — genau wie heute über die `servedBy`-Closure. Überlege dir, wie du das
  in der neuen Struktur abbildest; wir gehen das im Review gemeinsam durch, das
  ist der kniffligste Teil.
- **Verifikation:** `yarn typecheck` + `yarn build` grün, dann Browser-Smoke-Test
  (Start/Galerie/Detail, Cache-Badges, `?date=` Detail) — ich helfe dir dabei.
- **Checkpoint:** committen, mir zeigen.

### Aufgabe 6 — `clear-redis-cache.post.ts` angleichen
- Falls sinnvoll: den Clear-Endpoint denselben `CachePort`/Storage nutzen lassen,
  damit die Namespace-Logik (`apod:`) an einer Stelle lebt. Klein; optional.
- **Checkpoint:** committen, mir zeigen.

---

## Wie wir zusammenarbeiten
- Du sagst „Aufgabe N fertig" + zeigst den Commit/Diff → ich reviewe streng
  (Grenzen sauber? pur wirklich pur? Typen? Test-Qualität?) und erkläre, was und
  warum ich anders machen würde.
- Steckst du fest: frag mit konkretem Code — ich gebe Hinweise, keine
  Komplettlösung (außer du willst sie explizit).
- Ich fasse keinen Code an, außer du bittest mich ausdrücklich darum.
