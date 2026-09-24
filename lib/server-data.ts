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
