import type { ApodEntry, ApodList, ApodSource } from "#shared/types";
import type { ApodDeps } from "#server/apod/ports";
import { listRange } from "#server/apod/mapper";
import { loadApodDetail, loadApodList } from "#server/apod/usecases";
import { redisCache } from "#server/apod/redisCache";
import { nasaApodSource } from "#server/apod/nasaSource";
import { imageProbe } from "#server/apod/imageProbe";

// Nitro SWR layer (the front cache): "fresh" only briefly so stale-while-
// revalidate is observable, then stale up to a day.
const NITRO_MAX_AGE = 30;
const NITRO_STALE_MAX_AGE = 86400;

// The concrete adapters injected into the pure use-cases. THE one place that
// decides "Redis + NASA + probe", swap here (or in a test) and nothing else changes.
const deps: ApodDeps = {
  cache: redisCache,
  source: nasaApodSource,
  probe: imageProbe,
};

const loadDetail = async (date: string): Promise<ApodEntry> => {
  let servedBy: ApodSource = "nitro";

  const throughNitro = defineCachedFunction(
      async (d: string): Promise<ApodEntry> => {
        const { entry, source } = await loadApodDetail(d, deps);
        servedBy = source; // only runs on a Nitro miss
        return entry;
      },
      {
        name: "apod-detail",
        group: "apod-nitro",
        getKey: (d: string) => d,
        maxAge: NITRO_MAX_AGE,
        staleMaxAge: NITRO_STALE_MAX_AGE,
        swr: true,
      },
  );

  const entry = await throughNitro(date);
  return { ...entry, _source: servedBy };
};

  const loadList = async (): Promise<ApodList> => {
    let servedBy: ApodSource = "nitro";
    const { start, end } = listRange();

    const throughNitro = defineCachedFunction(
        async (): Promise<ApodList> => {
          const { list, source } = await loadApodList(deps);
          servedBy = source;
          return list;
        },
        {
          name: "apod-list",
          group: "apod-nitro",
          getKey: () => `${start}_${end}`,
          maxAge: NITRO_MAX_AGE,
          staleMaxAge: NITRO_STALE_MAX_AGE,
          swr: true,
        },
    );

    const list = await throughNitro();
    return { ...list, _source: servedBy };
  };

  export default defineEventHandler(
      async (event): Promise<ApodList | ApodEntry> => {
        const { date } = getQuery(event);
        const dateParam = typeof date === "string" && date.length > 0 ? date : null;

        // Reject malformed dates up front: a failed NASA response is never cached,
        // so an invalid `?date=` would otherwise hit the rate-limited API every call.
        if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
          throw createError({ statusCode: 400, statusMessage: "Invalid date." });
        }

        return dateParam ? loadDetail(dateParam) : loadList();
      },
  );
