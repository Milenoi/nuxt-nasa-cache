// Ports: the interfaces the APOD core depends on. The use-cases talk ONLY to
// these abstractions; the concrete tools (Redis, NASA, image probing) implement
// them as adapters. This is what inverts the dependency, the core owns the
// contract, infrastructure conforms to it.
import type { ApodApiEntry } from "#server/utils/apodSchema";

// A generic key/value cache the core reads from and writes to. It has no idea
// Redis exists behind it, could just as well be an in-memory Map (that's what
// the tests inject).
export interface CachePort {
  // Return the value stored under `key`, or null on a miss. `<T>` lets the
  // caller say what shape it expects back.
  get: <T>(key: string) => Promise<T | null>;
  // Store `value` under `key` for `ttlSeconds` seconds, then it expires.
  set: <T>(key: string, value: T, ttlSeconds: number) => Promise<void>;
}

// The origin that produces raw APOD data. The NASA adapter fetches + validates;
// the core only sees already-validated `ApodApiEntry` objects.
export interface ApodSourcePort {
  // Fetch the entries for a date range (the list view).
  fetchList: (start: string, end: string) => Promise<ApodApiEntry[]>;
  // Fetch a single entry for one date (the detail view).
  fetchDetail: (date: string) => Promise<ApodApiEntry>;
}

// Measures an image's intrinsic size. Kept separate because only image details
// need it, and the core shouldn't know HOW the measuring happens.
export interface MediaProbePort {
  // Return the image's width/height, or null if it can't be determined.
  probeSize: (url: string) => Promise<{ width: number; height: number } | null>;
}

// The bundle of ports a use-case needs, injected as one argument. Swap any
// member for a fake in a test and the use-case runs without real infrastructure.
export interface ApodDeps {
  cache: CachePort;
  source: ApodSourcePort;
  probe: MediaProbePort;
}
