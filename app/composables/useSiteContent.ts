import { useQuery } from "@tanstack/vue-query";
import type { ContentSource, SiteContent } from "#shared/types";

/**
 * Synchronous accessor for the site content (labels, nav, hero/how/about copy,
 * per-page SEO). The content is prefetched into the Vue Query cache by the
 * vue-query plugin on the server and hydrated on the client, so this reads it
 * straight from the shared cache — no `await`, no Suspense — which lets even
 * layout chrome (header, footer) consume it without becoming async components.
 *
 * - `content`: the reactive payload (undefined only before the cache is warm).
 * - `serverSource`: which server layer produced it ("origin"/"redis"/"nitro").
 * - `fromClientCache`: true when Vue Query holds it on the client.
 */
export default function useSiteContent(): {
  content: Ref<SiteContent | undefined>;
  serverSource: Ref<ContentSource>;
  fromClientCache: Ref<boolean>;
} {
  const { data, isFetching } = useQuery<SiteContent>({
    queryKey: ["content"],
    queryFn: () =>
      ($fetch as (url: string) => Promise<SiteContent>)("/api/content"),
  });

  const serverSource = computed<ContentSource>(
    () => data.value?._source ?? "origin",
  );
  const fromClientCache = computed(() => !isFetching.value && !!data.value);

  return { content: data, serverSource, fromClientCache };
}
