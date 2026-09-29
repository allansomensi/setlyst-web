import { getTranslations } from "next-intl/server";
import { fetchServerApi } from "@/lib/api-server";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";
import { canManageBandSetlists } from "@/lib/band-permissions";
import type { BandWithMembership, PaginatedResponse } from "@/types/api";
import { TRASH_TYPES, type TrashItem, type TrashType } from "@/types/content";
import { TrashView } from "./_components/trash-view";
import { isUuid } from "@/lib/uuid";

export async function generateMetadata() {
  const t = await getTranslations("trash");
  return { title: t("title") };
}

const PER_PAGE = 20;

export default async function TrashPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;

  const bandsRes = await fetchOrFailed(
    fetchServerApi<BandWithMembership[]>("/bands"),
  );
  const bands = (bandsRes === FETCH_FAILED ? [] : bandsRes)
    .filter(canManageBandSetlists)
    .map((band) => ({ id: band.id, name: band.name, logoUrl: band.logo_url }));

  const bandParam = one("band");
  const bandId =
    bandParam && isUuid(bandParam) && bands.some((b) => b.id === bandParam)
      ? bandParam
      : null;
  const typeParam = one("type");
  const type = (TRASH_TYPES as readonly string[]).includes(typeParam ?? "")
    ? (typeParam as TrashType)
    : null;
  const page = Math.max(1, Math.min(1000, Number(one("page")) || 1));

  const query = new URLSearchParams({
    scope: bandId ? "band" : "personal",
    page: String(page),
    per_page: String(PER_PAGE),
  });
  if (bandId) query.set("band_id", bandId);
  if (type) query.set("type", type);

  // "Empty trash" empties the whole scope whatever the type filter, so
  // whether there is anything to empty can't come from the filtered list:
  // with a filter on, one more (one-row) request counts the whole scope.
  const scopeQuery = new URLSearchParams(query);
  scopeQuery.delete("type");
  scopeQuery.set("page", "1");
  scopeQuery.set("per_page", "1");
  const [result, scopeRes] = await Promise.all([
    fetchOrFailed(
      fetchServerApi<PaginatedResponse<TrashItem>>(`/trash?${query}`),
    ),
    type
      ? fetchOrFailed(
          fetchServerApi<PaginatedResponse<TrashItem>>(`/trash?${scopeQuery}`),
        )
      : null,
  ]);
  // null = unknown (no filter, or the count failed): the view falls back.
  const scopeTotal =
    scopeRes && scopeRes !== FETCH_FAILED
      ? (scopeRes.meta?.total_items ?? null)
      : null;

  return (
    <TrashView
      bands={bands}
      bandId={bandId}
      type={type}
      page={page}
      items={result === FETCH_FAILED ? [] : result.data}
      meta={result === FETCH_FAILED ? null : result.meta}
      loadError={result === FETCH_FAILED}
      scopeTotal={scopeTotal}
    />
  );
}
