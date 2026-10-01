import type { Metadata } from "next";
import {
  getFormatter,
  getLocale,
  getTimeZone,
  getTranslations,
} from "next-intl/server";
import { Inbox } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlatformRoleBadge } from "@/components/role-badge";
import { ActiveFilters } from "@/components/staff/active-filters";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { ListPagination } from "@/components/staff/list-controls";
import { ListEmptyState } from "@/components/staff/list-empty-state";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { UserAvatar } from "@/components/user-avatar";
import { Link } from "@/i18n/routing";
import type { ListSearchParams } from "@/lib/admin-list";
import { fetchServerApi } from "@/lib/api-server";
import { formatApiDateTime, parseApiTimestamp } from "@/lib/dates";
import { requireStaffPage } from "@/lib/staff-guard";
import {
  DEFAULT_TICKET_TAB,
  hasInboxFilters,
  inboxApiQuery,
  isAwaitingStaff,
  parseInboxFilters,
  ticketLabel,
} from "@/lib/support-admin";
import { cn } from "@/lib/utils";
import type { PaginatedResponse } from "@/types/api";
import type {
  AdminSupportTicket,
  SupportSummary,
  TicketTab,
} from "@/types/operations";
import { SupportFilters } from "./_components/support-filters";
import { SupportKpis } from "./_components/support-kpis";
import {
  AwaitingReplyBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "./_components/ticket-badges";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("supportAdmin");
  return { title: t("title") };
}

const BASE = "/dashboard/admin/support";

function tabCounts(
  summary: SupportSummary | null,
): Partial<Record<TicketTab, number>> | null {
  if (!summary) return null;
  return {
    active: summary.open + summary.pending,
    open: summary.open,
    pending: summary.pending,
    resolved: summary.resolved,
    closed: summary.closed,
    all: summary.open + summary.pending + summary.resolved + summary.closed,
  };
}

export default async function SupportInboxPage({
  searchParams,
}: {
  searchParams: ListSearchParams;
}) {
  const { actor } = await requireStaffPage("support");
  const t = await getTranslations("supportAdmin");
  const locale = await getLocale();
  const timeZone = await getTimeZone();
  const format = await getFormatter();
  const raw = await searchParams;
  const filters = parseInboxFilters(raw);

  const [result, summary] = await Promise.all([
    fetchServerApi<PaginatedResponse<AdminSupportTicket>>(
      `/admin/support/tickets?${inboxApiQuery(filters, actor.id)}`,
    ).catch(() => null),
    fetchServerApi<SupportSummary>("/admin/support/summary").catch(() => null),
  ]);

  const tickets = result?.data ?? [];
  // An explicit "now" for relative times (next-intl warns without one).
  const now = new Date();
  const clearHref =
    filters.tab === DEFAULT_TICKET_TAB ? BASE : `${BASE}?status=${filters.tab}`;
  const requester = filters.userId
    ? tickets.find((ticket) => ticket.user_id === filters.userId)
    : undefined;

  return (
    <>
      <AdminPageHeader title={t("title")} description={t("description")} />

      {summary && <SupportKpis summary={summary} />}

      <SupportFilters
        tab={filters.tab}
        assignee={filters.assignee}
        counts={tabCounts(summary)}
      />

      <ActiveFilters
        basePath={BASE}
        params={raw}
        labels={{
          user_id: filters.userId
            ? requester
              ? `@${requester.username}`
              : t("filters.oneRequester")
            : null,
        }}
      />

      {result === null ? (
        <LoadErrorNotice />
      ) : (
        <div className="bg-card overflow-hidden rounded-xl border shadow-(--shadow-surface)">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.request")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("columns.requester")}
                </TableHead>
                <TableHead className="hidden xl:table-cell">
                  {t("columns.category")}
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  {t("columns.priority")}
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("columns.status")}
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  {t("columns.assignee")}
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("columns.lastActivity")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    <ListEmptyState
                      icon={Inbox}
                      title={t(`empty.${filters.tab}`)}
                      filtered={hasInboxFilters(filters)}
                      clearHref={clearHref}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => {
                  const awaiting = isAwaitingStaff(ticket);
                  const lastActivity = format.relativeTime(
                    parseApiTimestamp(ticket.last_message_at),
                    now,
                  );
                  return (
                    <TableRow
                      key={ticket.id}
                      className={cn(
                        ticket.priority === "urgent" &&
                          ticket.status !== "closed" &&
                          "bg-red-500/[0.03]",
                      )}
                    >
                      <TableCell className="align-top whitespace-normal">
                        <Link
                          href={`${BASE}/${ticket.id}`}
                          prefetch={false}
                          className="group focus-visible:ring-ring/50 block max-w-64 min-w-0 rounded-sm focus-visible:ring-3 focus-visible:outline-none sm:max-w-80"
                        >
                          <span className="text-muted-foreground font-mono text-xs tabular-nums">
                            {ticketLabel(ticket)}
                          </span>
                          <span
                            className="block truncate font-medium group-hover:underline"
                            title={ticket.subject}
                          >
                            {ticket.subject}
                          </span>
                        </Link>
                        {awaiting && <AwaitingReplyBadge className="mt-1" />}
                        {/* What the hidden columns carry, on a phone. */}
                        <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-1.5 text-xs sm:hidden">
                          <TicketStatusBadge status={ticket.status} />
                          <TicketPriorityBadge priority={ticket.priority} />
                          <span>@{ticket.username}</span>
                          <span aria-hidden>·</span>
                          <span>{lastActivity}</span>
                        </div>
                        <div className="mt-1.5 hidden flex-wrap items-center gap-1.5 sm:flex lg:hidden">
                          <TicketPriorityBadge priority={ticket.priority} />
                          <span className="text-muted-foreground text-xs md:hidden">
                            @{ticket.username}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden align-top md:table-cell">
                        <div className="flex min-w-0 items-center gap-2">
                          <UserAvatar
                            userId={ticket.user_id}
                            name={ticket.username}
                            avatarUrl={ticket.user_avatar_url}
                            size="sm"
                          />
                          <div className="min-w-0 space-y-0.5">
                            <span className="block max-w-40 truncate text-sm">
                              @{ticket.username}
                            </span>
                            <PlatformRoleBadge role={ticket.user_role} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden align-top text-sm xl:table-cell">
                        {t(`category.${ticket.category}`)}
                      </TableCell>
                      <TableCell className="hidden align-top lg:table-cell">
                        <TicketPriorityBadge priority={ticket.priority} />
                      </TableCell>
                      <TableCell className="hidden align-top sm:table-cell">
                        <TicketStatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell className="hidden align-top text-sm lg:table-cell">
                        {ticket.assignee_username ? (
                          <span
                            className={cn(
                              ticket.assignee_id === actor.id && "font-medium",
                            )}
                          >
                            @{ticket.assignee_username}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">
                            {t("unassigned")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden align-top text-sm sm:table-cell">
                        <time
                          dateTime={ticket.last_message_at}
                          title={formatApiDateTime(
                            ticket.last_message_at,
                            locale,
                            timeZone,
                          )}
                        >
                          {lastActivity}
                        </time>
                        <span className="block text-xs">
                          {t("messageCount", { count: ticket.message_count })}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ListPagination
        page={filters.page}
        totalPages={result?.meta?.total_pages ?? 1}
        totalItems={result?.meta?.total_items ?? tickets.length}
      />
    </>
  );
}
