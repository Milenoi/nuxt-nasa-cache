# JSON-LD mit nuxt-schema-org, Design

**Ziel:** Auf allen Seiten des Demos strukturierte Daten (JSON-LD) ausliefern,
erzeugt vom Modul `nuxt-schema-org`, statt handgeschriebener `useHead`-Blöcke.

**Ausgangslage (geprüft am 2026-07-29):**

- `nuxt-schema-org` ist **nicht** installiert und nicht in `nuxt.config.ts`
  eingetragen. Es gibt auch keine `site`-Config; die kanonische URL kommt aus
  `runtimeConfig.public.siteUrl`.
- `app/app.vue` setzt globale SEO-Defaults, Canonical (aus `route.path`, also
  ohne Query) sowie OG/Twitter.
- `app/pages/faq.vue` enthält das einzige bestehende JSON-LD: ein
  handgeschriebenes `FAQPage` über `useHead` mit `application/ld+json`.
- Alle anderen Seiten haben nur `useSeoMeta`, kein JSON-LD.
- `app/plugins/vue-query.ts` prefetcht `/api/content` serverseitig mit `await`,
  der Site-Content ist beim SSR also immer warm.

**Tech:** Nuxt 4.5 (SSR), TypeScript strict, Vitest, Yarn 4, Node 24
(`nvm use`). Modul-Zielversion `nuxt-schema-org@^6.2.8` (zieht `nuxt-site-config`
als Abhängigkeit mit).

## Entscheidungen

1. **Modul statt Handarbeit.** `nuxt-schema-org` übernimmt die `@id`-Verknüpfung
   der Knoten (WebSite -> WebPage -> primaryImageOfPage), die Auflösung relativer
   URLs gegen die Site-URL und das Zusammenführen zu einem Graph. Genau das
   müssten wir sonst selbst schreiben und testen.
2. **Voller Umfang pro Seitentyp**, nicht nur globale Defaults (siehe Tabelle).
3. **Publisher ist eine Person** (Melanie Stief), keine erfundene Organisation,
   konfiguriert über `schemaOrg.identity` in `nuxt.config.ts`. Das ist der
   dokumentierte Weg; das Modul verlinkt den Knoten dann selbst als `publisher`
   der `WebSite`, wir brauchen kein `definePerson` in `app.vue`.
   Die APOD-Medien gehören nicht der Site: `entry.copyright` (Fallback NASA)
   landet in `creditText`/`copyrightNotice` des jeweiligen Medienknotens, nicht
   im Publisher.
4. **`/faq` wird umgestellt**, nicht ergänzt: der handgeschriebene
   `useHead`-Block entfällt vollständig und wird durch `defineQuestion` ersetzt.
5. **`schemaOrg.reactive` bleibt auf dem Default `false`.** JSON-LD entsteht beim
   SSR und wird bei Client-Navigation neu berechnet, aber nicht live innerhalb
   einer Seite. Für Crawler reicht der SSR-Output, und es kostet kein
   Client-Bundle.
6. **Die `ItemList` der Galerie beschreibt alle Einträge, nicht die gefilterte
   Liste.** `?type=` kollabiert per Canonical auf `/apod`; eine gefilterte Liste
   würde die kanonische Seite je nach aufgerufener Filter-URL anders beschreiben.

## Konfiguration

In `nuxt.config.ts` eine gemeinsame Konstante, damit URL und Name **eine**
Wahrheit behalten:

```ts
const site = {
  url: "https://nuxt-cache-project.netlify.app",
  name: "Nuxt Cache Project",
  description:
    "A Nuxt 4 demo of multi-layer caching (Redis + TanStack Query) over the NASA APOD API.",
};

export default defineNuxtConfig({
  modules: [..., "nuxt-schema-org"],
  site,
  schemaOrg: {
    identity: {
      type: "Person",
      name: "Melanie Stief",
      url: site.url,
      sameAs: ["https://github.com/Milenoi", "https://viridis.de"],
    },
  },
  runtimeConfig: {
    public: {
      siteName: site.name,
      siteDescription: site.description,
      siteUrl: site.url,
      language: "en-US",
    },
  },
});
```

`app.vue` liest weiter `runtimeConfig.public`, das Modul liest `site`. Ohne die
gemeinsame Konstante gäbe es zwei Orte mit derselben URL, die auseinanderlaufen.
Die `sameAs`-Profile stammen aus den Links, die die Site schon zeigt:
`header.githubUrl` (`https://github.com/Milenoi/nuxt-nasa-cache`, im Profil-Link
auf `https://github.com/Milenoi` gekürzt) und `about.creditUrl`
(`https://viridis.de`).

## Neue Bausteine

Zwei neue Dateien, damit die Seiten dünn bleiben und die Logik testbar ist:

### `app/utils/getApodSchema.ts`

Reine Funktionen ohne Nuxt-Kontext, Eingabe `ApodEntry`, Ausgabe Plain-Objekte:

- `getApodImageNode(entry, siteUrl)`: `contentUrl` (`hdurl` bevorzugt, sonst
  `url`), `width`/`height` nur wenn vorhanden, `caption` aus `title`,
  `description` aus `explanation`, `datePublished` aus `date`, `creditText` und
  `copyrightNotice` aus `copyright` mit Fallback `"NASA"`.
- `getApodVideoNode(entry, siteUrl)`: `name`, `description`, `uploadDate` aus
  `date`, `thumbnailUrl`, `embedUrl` bzw. `contentUrl` abhängig vom Ergebnis des
  bestehenden `getApodEmbed` (`youtube`/`vimeo`/`external` -> `embedUrl`,
  `file` -> `contentUrl`).
- `getApodListItems(entries, siteUrl)`: `ListItem`-Array mit `position` ab 1,
  `url` auf `/apod/<date>`, `name` und `image`.

Felder, für die keine Daten vorliegen, werden **weggelassen**, nicht mit leeren
Strings oder erfundenen Werten belegt.

### `app/composables/useSchemaBreadcrumb.ts`

Baut `defineBreadcrumb` aus `content.menu` und der aktuellen Route, damit die
Labels dieselben sind wie in der Navigation und jede Seite nur einen Aufruf
braucht.

Die `define*`-Aufrufe selbst bleiben in den Seiten, so bleibt sichtbar, welche
Seite was über sich behauptet.

## Knoten pro Seite

Verifizierte Helper-Namen (aus den Typen von `@unhead/schema-org`, dem Kern des
Moduls): `defineWebSite`, `defineWebPage`, `defineImage` (**nicht**
`defineImageObject`), `defineVideo`, `defineQuestion`, `defineBreadcrumb`,
`defineItemList`, `defineListItem`, `defineArticle`, `definePerson`.

| Ort | Knoten |
| --- | --- |
| `nuxt.config.ts` | Identity-Knoten (`Person`) über `schemaOrg.identity`, vom Modul als `publisher` verlinkt |
| `app/app.vue` | `defineWebSite` (Name und Beschreibung aus `site`) |
| `/` | `defineWebPage` + `primaryImageOfPage` aus dem aktuellen APOD-Eintrag |
| `/apod` | `defineWebPage({ "@type": "CollectionPage" })` + `defineItemList` aller Einträge + Breadcrumb |
| `/apod/:date` | `defineWebPage` + `defineImage` oder `defineVideo` je `mediaType` + Breadcrumb |
| `/how` | `defineArticle({ "@type": "TechArticle" })`, `author` per `@id` auf den Person-Knoten, ohne `datePublished` + Breadcrumb |
| `/faq` | `defineWebPage({ "@type": "FAQPage" })` + `defineQuestion` je Item, alter `useHead`-Block entfällt |
| `/about` | `defineWebPage({ "@type": "AboutPage" })` + Breadcrumb |

Bei `mediaType: "other"` entsteht kein Medienknoten, nur die `WebPage`.

Namen und Beschreibungen kommen aus `useSiteContent` (`content.seo.*`,
`content.menu.*`), also aus derselben Quelle wie die Meta-Tags. Der Content ist
beim SSR warm, weil der Vue-Query-Plugin ihn awaited prefetcht.

## Verifikation

- `test/apod/getApodSchema.test.ts` (neu): Bild-Eintrag, Video-Eintrag pro
  Embed-Typ, Eintrag ohne `copyright` (Fallback NASA), Eintrag ohne
  `width`/`height` (Felder fehlen im Output statt leer zu sein),
  `ItemList`-Positionen beginnen bei 1.
- `yarn typecheck` und `yarn lint` müssen grün sein.
- Manuell: `yarn dev`, pro Route den SSR-Output per `curl` auf
  `<script type="application/ld+json">` prüfen (nicht im Browser, damit wirklich
  der Server-Output geprüft wird), danach einmal durch den Rich Results Test.

## Nicht Teil dieser Arbeit

- Sitemap, robots.txt, OG-Image-Generierung oder Link-Checker (`@nuxtjs/seo`).
- Änderungen an der Canonical-Logik oder an `useSeoMeta`-Aufrufen.
- Client-seitige Reaktivität des Graphen (`schemaOrg.reactive: true`).
