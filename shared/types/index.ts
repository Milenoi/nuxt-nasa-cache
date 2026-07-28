export interface ClearRedisCacheResponse {
    status: number;
    message: string;
    error?: string;
}

// ---- NASA APOD (Astronomy Picture of the Day) ----

export interface ApodQueryParams {
    date?: string;
    startDate?: string;
    endDate?: string;
}

export type ApodMediaType = "image" | "video" | "other";

/**
 * Which layer of the cache chain served a response, from origin outward:
 * NASA (origin) -> Redis (persistent) -> Nitro (SWR front). Vue Query (client)
 * sits in front of all of these and is tracked separately.
 */
export type ApodSource = "nasa" | "redis" | "nitro";

/** Normalized entry consumed by the UI. */
export interface ApodEntry {
    date: string;
    title: string;
    explanation: string;
    mediaType: ApodMediaType;
    url: string;
    hdurl: string | null;
    thumbnailUrl: string | null;
    copyright: string | null;
    formattedDate: string;
    /** Intrinsic image dimensions, probed server-side so the UI can reserve the
     *  exact aspect ratio and avoid layout shift. Null for videos/other or when
     *  probing failed. */
    width: number | null;
    height: number | null;
    /** Where this response came from — set fresh by the server on every request. */
    _source?: ApodSource;
}

export interface ApodList {
    entries: ApodEntry[];
    _source?: ApodSource;
}

export interface ApodEmbed {
    type: "youtube" | "vimeo" | "file" | "external";
    src: string;
}

// ---- Site content (the static UI copy, served through the cache chain) ----

/**
 * Which layer of the cache chain served the site content, from origin outward:
 * the bundled JSON (origin) -> Redis (persistent) -> Nitro (SWR front). Mirrors
 * {@link ApodSource}, but the origin here is the app's own content file rather
 * than NASA.
 */
export type ContentSource = "origin" | "redis" | "nitro";

export interface AboutTechRow {
    label: string;
    value: string;
}

/** The `about` section of the static content, consumed by the About page. */
export interface AboutContent {
    tagline: string;
    heading: string;
    lead1: string;
    lead2: string;
    techStackLabel: string;
    techStack: AboutTechRow[];
    cta: string;
    creditText: string;
    creditSep: string;
    creditLinkLabel: string;
    creditUrl: string;
    /** Cross-link to the sibling RAG demo (mirrors the link back on that site). */
    siblingText: string;
    siblingLinkLabel: string;
    siblingUrl: string;
    siblingSuffix: string;
}

/** A single nav entry (label + route), shared by the header and the sitemap. */
export interface MenuLink {
    label: string;
    link: string;
}

/** Per-page SEO copy, kept in the content so pages don't hardcode meta tags. */
export interface SeoEntry {
    title: string;
    description: string;
}

/** Pages that have their own SEO entry in the content. */
export type SeoPage = "home" | "apod" | "how" | "about";

export interface CommonContent {
    isFetchingFromLabel: string;
    backLabel: string;
    skipToContent: string;
}

export interface HeaderContent {
    brand: string;
    github: string;
    githubUrl: string;
}

export interface HeroContent {
    tagline: string;
    cta: string;
    client: string;
    clientLayer: string;
    serverRedis: string;
    serverRedisLayer: string;
    serverNasa: string;
    serverNasaLayer: string;
    serverNitro: string;
    serverNitroLayer: string;
}

export interface FooterContent {
    invalidateLabel: string;
    deleteLabel: string;
    vueQuery: string;
    nitro: string;
    redis: string;
    nasa: string;
    vueQueryTitle: string;
    nitroTitle: string;
    redisTitle: string;
    statusReady: string;
    toastRevalidated: string;
    toastNothingToRefetch: string;
    toastClearFail: string;
}

export interface ApodAllContent {
    fromLabel: string;
    videoLabel: string;
    noResult: string;
    filterAll: string;
    filterImages: string;
    filterVideos: string;
    viewSourceLabel: string;
    bothCaches: string;
    muteLabel: string;
    unmuteLabel: string;
    playLabel: string;
    pauseLabel: string;
    seekLabel: string;
}

export interface ApodContent {
    all: ApodAllContent;
    listPage: { title: string; heading: string };
}

export interface HowStep {
    name: string;
    role: string;
    desc: string;
    href: string;
}

export interface HowContent {
    tagline: string;
    heading: string;
    leadBefore: string;
    leadHighlight: string;
    leadAfter: string;
    docsLabel: string;
    codeShow: string;
    codeHide: string;
    steps: HowStep[];
    guideHeading: string;
    guideLead: string;
    guide: { title: string; desc: string }[];
}

/**
 * The full site content payload returned by `/api/content`. Every section
 * consumers read is typed precisely, so pages and components can drop their
 * direct static-text imports and read everything through the cache chain.
 */
export interface SiteContent {
    seo: Record<SeoPage, SeoEntry>;
    common: CommonContent;
    header: HeaderContent;
    hero: HeroContent;
    footer: FooterContent;
    /** Nav entries, keyed by page. */
    menu: { home: MenuLink; apod: MenuLink; how: MenuLink; about: MenuLink };
    apod: ApodContent;
    how: HowContent;
    about: AboutContent;
    /** Where this response came from — set fresh by the server on every request. */
    _source?: ContentSource;
}

