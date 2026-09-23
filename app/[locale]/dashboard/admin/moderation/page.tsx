import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ShieldQuestion } from "lucide-react";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { ListPagination } from "@/components/staff/list-controls";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { fetchServerApi } from "@/lib/api-server";
import {
  parseModerationTab,
  parseModerationUserFilter,
} from "@/lib/moderation";
import { requireStaffPage } from "@/lib/staff-guard";
import type { ListSearchParams } from "@/lib/admin-list";
import type { PaginatedResponse, User } from "@/types/api";
import {
  MODERATION_TARGETS,
  type ModerationFlag,
  type ModerationSummary,
  type ModerationTarget,
} from "@/types/staff";
import { FlagCard } from "./_components/flag-card";
import { ModerationFilters } from "./_components/moderation-filters";
import { RescanButton } from "./_components/rescan-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("moderation");
  return { title: t("title") };
}

const PER_PAGE = 20;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: ListSearchParams;
}) {
  const { actor, can } = await requireStaffPage("moderation");
  const t = await getTranslations("moderation");
  const raw = await searchParams;
  const tab = parseModerationTab(first(raw.status));
  const typeParam = first(raw.type);
  const type = (MODERATION_TARGETS as readonly string[]).includes(
    typeParam ?? "",
  )
    ? (typeParam as ModerationTarget)
    : null;
  const page = Math.max(1, Number.parseInt(first(raw.page) ?? "1", 10) || 1);
  const userId = parseModerationUserFilter(first(raw.user_id));

  const query = new URLSearchParams({
    status: tab,
    page: String(page),
    per_page: String(PER_PAGE),
  });
  if (type) query.set("target_type", type);
  if (userId) query.set("user_id", userId);

  const [flags, summary, filteredUser] = await Promise.all([
    fetchServerApi<PaginatedResponse<ModerationFlag>>(
      `/admin/moderation/flags?${query}`,
    ).catch(() => null),
    fetchServerApi<ModerationSummary>("/admin/moderation/summary").catch(
      () => null,
    ),
    userId
      ? fetchServerApi<Pick<User, "id" | "username">>(`/users/${userId}`).catch(
          () => null,
        )
      : Promise.resolve(null),
  ]);

  const items = flags?.data ?? [];

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        description={t("description")}
        actions={can("moderation.rescan") ? <RescanButton /> : undefined}
      />

      <div className="bg-muted/40 text-muted-foreground flex gap-3 rounded-xl border px-4 py-3 text-sm">
        <ShieldQuestion className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>{t("scope")}</p>
      </div>

      <ModerationFilters
        tab={tab}
        type={type}
        openTotal={summary?.open_total ?? null}
        openByType={summary?.by_type ?? {}}
        userFilter={
          userId
            ? {
                id: userId,
                username:
                  filteredUser?.username ??
                  flags?.data[0]?.user.username ??
                  null,
              }
            : null
        }
      />

      {flags === null ? (
        <LoadErrorNotice />
      ) : items.length === 0 ? (
        <div className="bg-card text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
          <p className="text-foreground font-medium">
            {t(`empty.${tab}.title`)}
          </p>
          <p className="max-w-md text-sm">{t(`empty.${tab}.description`)}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((flag) => (
            <li key={flag.id}>
              <FlagCard flag={flag} actor={actor} />
            </li>
          ))}
        </ul>
      )}

      <ListPagination
        page={page}
        totalPages={flags?.meta?.total_pages ?? 1}
        totalItems={flags?.meta?.total_items ?? items.length}
      />
    </>
  );
}
