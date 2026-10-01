import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import {
  Guitar,
  LifeBuoy,
  ListMusic,
  Music,
  Search,
  SearchX,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BandAvatar } from "@/components/bands/band-avatar";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { Link } from "@/components/nav-link";
import { PlatformRoleBadge } from "@/components/role-badge";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { UserAvatar } from "@/components/user-avatar";
import type { ListSearchParams } from "@/lib/admin-list";
import { fetchServerApi } from "@/lib/api-server";
import { normalizeSearch, SEARCH_MIN_LENGTH, searchState } from "@/lib/console";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";
import { requireStaffPage } from "@/lib/staff-guard";
import type { ConsoleSearchResults } from "@/types/operations";
import { ConsoleSearchForm } from "../_components/console-search-form";

/** Matches of each kind the API returns at most ("see all" past that). */
const PER_KIND = 5;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("console.search");
  return { title: t("title") };
}

function Group({
  id,
  icon: Icon,
  title,
  count,
  seeAll,
  seeAllLabel,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  count: number;
  /** The full listing for this kind, when there may be more. */
  seeAll: string | null;
  seeAllLabel: string;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <Card className="gap-3" aria-labelledby={id} role="region">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle id={id} className="flex items-center gap-2 text-base">
          <Icon className="text-muted-foreground size-4" aria-hidden />
          {title}
        </CardTitle>
        {seeAll && (
          <Link
            href={seeAll}
            prefetch={false}
            className="text-primary text-sm font-medium underline-offset-4 hover:underline"
          >
            {seeAllLabel}
          </Link>
        )}
      </CardHeader>
      <CardContent>
        <ul className="-mx-2 divide-y">{children}</ul>
      </CardContent>
    </Card>
  );
}

const rowLink =
  "hover:bg-muted focus-visible:ring-ring/50 flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 outline-none focus-visible:ring-3";

export default async function ConsoleSearchPage({
  searchParams,
}: {
  searchParams: ListSearchParams;
}) {
  const { can } = await requireStaffPage("console");
  const t = await getTranslations("console.search");
  const params = await searchParams;
  const q = normalizeSearch(params.q);
  const state = searchState(q);

  const response =
    state === "ready"
      ? await fetchOrFailed(
          fetchServerApi<ConsoleSearchResults>(
            `/admin/search?${new URLSearchParams({ q })}`,
          ),
        )
      : null;
  const results = response && response !== FETCH_FAILED ? response : null;
  const total = results
    ? results.users.length +
      results.bands.length +
      results.songs.length +
      results.setlists.length +
      results.tickets.length
    : 0;
  const encoded = encodeURIComponent(q);
  const seeAll = (count: number, href: string) =>
    count >= PER_KIND ? href : null;

  return (
    <>
      <AdminPageHeader title={t("title")} description={t("description")} />
      {/* Keyed by the query: Back/Forward to another search refills it. */}
      <ConsoleSearchForm
        key={q}
        defaultValue={q}
        autoFocus={state !== "ready"}
        className="max-w-2xl"
      />

      {state === "empty" && (
        <EmptyState
          icon={Search}
          title={t("emptyTitle")}
          description={t("emptyHint")}
        />
      )}
      {state === "short" && (
        <EmptyState
          icon={Search}
          title={t("tooShort", { min: SEARCH_MIN_LENGTH })}
        />
      )}
      {response === FETCH_FAILED && <LoadErrorNotice />}
      {results && total === 0 && (
        <EmptyState
          icon={SearchX}
          title={t("noResults", { q })}
          description={t("noResultsHint")}
        />
      )}

      {results && total > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <p className="sr-only" role="status">
            {t("resultCount", { count: total })}
          </p>

          <Group
            id="search-users"
            icon={Users}
            title={t("groups.users")}
            count={results.users.length}
            seeAll={seeAll(
              results.users.length,
              `/dashboard/users?q=${encoded}`,
            )}
            seeAllLabel={t("seeAll")}
          >
            {results.users.map((user) => (
              <li key={user.id}>
                {/* Not prefetched: opening an account is audited. */}
                <Link
                  href={`/dashboard/users/${user.id}`}
                  prefetch={false}
                  className={rowLink}
                >
                  <UserAvatar
                    userId={user.id}
                    name={user.username}
                    avatarUrl={user.avatar_url}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      @{user.username}
                    </span>
                    {user.email && (
                      <span className="text-muted-foreground block truncate text-xs">
                        {user.email}
                      </span>
                    )}
                  </span>
                  <PlatformRoleBadge role={user.role} />
                </Link>
              </li>
            ))}
          </Group>

          {can("support") && (
            <Group
              id="search-tickets"
              icon={LifeBuoy}
              title={t("groups.tickets")}
              count={results.tickets.length}
              seeAll={seeAll(
                results.tickets.length,
                `/dashboard/admin/support?status=all&q=${encoded}`,
              )}
              seeAllLabel={t("seeAll")}
            >
              {results.tickets.map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={`/dashboard/admin/support/${ticket.id}`}
                    className={rowLink}
                  >
                    <span className="text-muted-foreground w-14 shrink-0 text-sm tabular-nums">
                      #{ticket.number}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {ticket.subject}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        @{ticket.username}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="outline">
                        {t(`ticketStatus.${ticket.status}`)}
                      </Badge>
                      {(ticket.priority === "urgent" ||
                        ticket.priority === "high") && (
                        <Badge
                          variant={
                            ticket.priority === "urgent"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {t(`priority.${ticket.priority}`)}
                        </Badge>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </Group>
          )}

          {can("content") && (
            <>
              <Group
                id="search-bands"
                icon={Guitar}
                title={t("groups.bands")}
                count={results.bands.length}
                seeAll={seeAll(
                  results.bands.length,
                  `/dashboard/admin/bands?q=${encoded}`,
                )}
                seeAllLabel={t("seeAll")}
              >
                {results.bands.map((band) => (
                  <li key={band.id}>
                    <Link
                      href={`/dashboard/admin/bands/${band.id}`}
                      className={rowLink}
                    >
                      <BandAvatar
                        bandId={band.id}
                        name={band.name}
                        logoUrl={band.logo_url}
                        className="h-8 w-8"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {band.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </Group>

              {(
                [
                  ["songs", Music, results.songs],
                  ["setlists", ListMusic, results.setlists],
                ] as const
              ).map(([kind, icon, rows]) => (
                <Group
                  key={kind}
                  id={`search-${kind}`}
                  icon={icon}
                  title={t(`groups.${kind}`)}
                  count={rows.length}
                  seeAll={seeAll(
                    rows.length,
                    `/dashboard/admin/${kind}?q=${encoded}`,
                  )}
                  seeAllLabel={t("seeAll")}
                >
                  {rows.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={`/dashboard/admin/${kind}/${row.id}`}
                        className={rowLink}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {row.title}
                          </span>
                          {(row.subtitle || row.owner_username) && (
                            <span className="text-muted-foreground block truncate text-xs">
                              {[
                                row.subtitle,
                                row.owner_username && `@${row.owner_username}`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </Group>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}
