import probe from "probe-image-size";

// Cap the probe so a slow NASA origin can never stall the detail response.
// On timeout we just skip dimensions for this request (best-effort).
const PROBE_TIMEOUT_MS = 3000;

/**
 * Read an image's intrinsic width/height by streaming only its header bytes
 * (not the full file). Used to store the aspect ratio in the cache so the detail
 * page can reserve the exact box before the image loads (avoids layout shift).
 * Returns null on any failure or timeout, a missing size just falls back to no
 * reservation, never breaks or delays the response.
 */
export const getImageSize = async (
  url: string,
): Promise<{ width: number; height: number } | null> => {
  try {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), PROBE_TIMEOUT_MS).unref?.(),
    );
    // .catch here so a late probe rejection (after the timeout won the race)
    // never surfaces as an unhandled rejection.
    const probing = probe(url).catch(() => null);
    const result = await Promise.race([probing, timeout]);
    if (!result?.width || !result.height) return null;
    return { width: result.width, height: result.height };
  } catch {
    return null;
  }
};
