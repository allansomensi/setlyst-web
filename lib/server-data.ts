import "server-only";

import { cache } from "react";
import { fetchServerApi } from "@/lib/api-server";
import type { User, UserPreferences } from "@/types/api";
import type { BillingMe } from "@/types/billing";

/**
 * Request-scoped (React `cache`) loaders for data several server
 * components of one render need — the root layout, the dashboard layout
 * and the page itself — so each is fetched once per request.
 */
export const getMyPreferences = cache(() =>
  fetchServerApi<UserPreferences>("/users/me/preferences"),
);

export const getMe = cache(() => fetchServerApi<User>("/users/me"));

export const getMyBilling = cache(() =>
  fetchServerApi<BillingMe>("/billing/me"),
);

const fetchOnce = cache((endpoint: string): Promise<unknown> =>
  fetchServerApi(endpoint),
);

/**
 * A plain GET of `endpoint`, made at most once per request. For the entity
 * a page and its `generateMetadata` both load: Next.js does not dedupe
 * these fetches itself, because every call carries a timeout signal.
 */
export function fetchServerApiOnce<T>(endpoint: string): Promise<T> {
  return fetchOnce(endpoint) as Promise<T>;
}
