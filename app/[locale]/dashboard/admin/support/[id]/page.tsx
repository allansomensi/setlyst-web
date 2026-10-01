import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTimeZone, getTranslations } from "next-intl/server";
import { ExternalLink, Inbox, Star, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DetailBackButton, DetailHeader } from "@/components/detail-header";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { PlatformRoleBadge } from "@/components/role-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Link } from "@/i18n/routing";
import { ApiError, fetchServerApi } from "@/lib/api-server";
import { formatApiDateTime } from "@/lib/dates";
import { requireStaffPage } from "@/lib/staff-guard";
import {
  contextEntries,
  isAwaitingStaff,
  ticketLabel,
} from "@/lib/support-admin";
import { isUuid } from "@/lib/uuid";
import type { PaginatedResponse, User } from "@/types/api";
import type { AdminSupportTicketDetail } from "@/types/operations";
import {
  AwaitingReplyBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "../_components/ticket-badges";
import { TicketComposer } from "./_components/ticket-composer";
import {
  TicketControls,
  type StaffMember,
} from "./_components/ticket-controls";
import { TicketThread } from "./_components/ticket-thread";

type Params = Promise<{ id: string }>;

const BASE = "/dashboard/admin/support";

// Request-scoped: generateMetadata and the page both need it.
const loadTicket = cache(async function loadTicket(
  id: string,
): Promise<AdminSupportTicketDetail | null> {
  if (!isUuid(id)) return null;
  try {
    return await fetchServerApi<AdminSupportTicketDetail>(
      `/admin/support/tickets/${encodeURIComponent(id)}`,
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400)
    ) {
      return null;
    }
    throw error;
  }
});

/**
 * Active admins and moderators, for the assignee picker (empty if it
 * fails). The API refuses deactivated staff as assignees.
 */
async function loadStaff(): Promise<StaffMember[]> {
  const pages = await Promise.all(
    (["admin", "moderator"] as const).map((role) =>
      fetchServerApi<PaginatedResponse<User>>(
        `/users?role=${role}&state=active&per_page=100`,
      ).catch(() => null),
    ),
  );
  return pages
    .flatMap((page) => page?.data ?? [])
    .map(({ id, username, role }) => ({ id, username, role }))
    .sort((a, b) => a.username.localeCompare(b.username));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("supportAdmin");
  const detail = await loadTicket(id).catch(() => null);
  return {
    title: detail
      ? `${ticketLabel(detail.ticket)} · ${detail.ticket.subject}`
      : t("title"),
  };
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right break-words">{children}</dd>
    </div>
  );
}

export default async function SupportTicketPage({
  params,
}: {
  params: Params;
}) {
  const { actor } = await requireStaffPage("support");
  const { id } = await params;
  const [detail, staff] = await Promise.all([loadTicket(id), loadStaff()]);
  if (!detail) notFound();

  const t = await getTranslations("supportAdmin");
  const locale = await getLocale();
  const timeZone = await getTimeZone();
  const { ticket, messages, other_tickets: others } = detail;
  // Staff don't handle their own requests (the API refuses it): a
  // colleague does.
  const ownRequest = ticket.user_id === actor.id;
  const when = (value: string | null) =>
    value ? formatApiDateTime(value, locale, timeZone) : null;
  const context = contextEntries(ticket.context);

  return (
    <>
      <PageBreadcrumbs
        items={[
          { label: t("title"), href: BASE },
          { label: ticketLabel(ticket) },
        ]}
      />

      <DetailHeader>
        <DetailBackButton href={BASE} label={t("title")} />
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
            {ticket.subject}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground font-mono tabular-nums">
              {ticketLabel(ticket)}
            </span>
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
            <span className="text-muted-foreground">
              {t(`category.${ticket.category}`)}
            </span>
            {isAwaitingStaff(ticket) && <AwaitingReplyBadge />}
          </div>
          <p className="text-muted-foreground text-sm">
            {t("detail.opened", {
              username: ticket.username,
              date: when(ticket.created_at) ?? "",
            })}
          </p>
        </div>
      </DetailHeader>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("thread.title")}</CardTitle>
              <CardDescription>
                {t("messageCount", { count: messages.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TicketThread ticket={ticket} messages={messages} />
            </CardContent>
          </Card>

          <Card id="reply">
            <CardHeader>
              <CardTitle>{t("composer.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {ownRequest ? (
                <p className="text-muted-foreground text-sm">
                  {t("detail.ownRequest")}
                </p>
              ) : (
                <TicketComposer ticketId={ticket.id} status={ticket.status} />
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 space-y-6" aria-label={t("detail.panel")}>
          <Card>
            <CardHeader>
              <CardTitle>{t("detail.manage")}</CardTitle>
            </CardHeader>
            <CardContent>
              {ownRequest ? (
                <p className="text-muted-foreground text-sm">
                  {t("detail.ownRequest")}
                </p>
              ) : (
                <TicketControls
                  ticket={ticket}
                  // Never the requester (the API refuses it).
                  staff={staff.filter((member) => member.id !== ticket.user_id)}
                  viewerId={actor.id}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("detail.requester")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  userId={ticket.user_id}
                  name={ticket.username}
                  avatarUrl={ticket.user_avatar_url}
                  size="md"
                />
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">@{ticket.username}</p>
                  {ticket.user_email && (
                    <p
                      className="text-muted-foreground truncate text-sm"
                      title={ticket.user_email}
                    >
                      {ticket.user_email}
                    </p>
                  )}
                  <PlatformRoleBadge role={ticket.user_role} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/users/${ticket.user_id}`}>
                    <UserRound aria-hidden />
                    {t("detail.openProfile")}
                    <ExternalLink className="size-3" aria-hidden />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`${BASE}?status=all&user_id=${ticket.user_id}`}>
                    <Inbox aria-hidden />
                    {t("detail.allRequests")}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("detail.facts")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="divide-y">
                <Fact label={t("facts.created")}>
                  {when(ticket.created_at)}
                </Fact>
                <Fact label={t("facts.lastActivity")}>
                  {when(ticket.last_message_at)}
                </Fact>
                <Fact label={t("facts.firstResponse")}>
                  {when(ticket.first_response_at) ?? (
                    <span className="text-muted-foreground italic">
                      {t("facts.noResponse")}
                    </span>
                  )}
                </Fact>
                {ticket.resolved_at && (
                  <Fact label={t("facts.resolved")}>
                    {when(ticket.resolved_at)}
                  </Fact>
                )}
                {ticket.closed_at && (
                  <Fact label={t("facts.closed")}>
                    {when(ticket.closed_at)}
                  </Fact>
                )}
                <Fact label={t("facts.rating")}>
                  {ticket.rating === null ? (
                    <span className="text-muted-foreground italic">
                      {t("facts.notRated")}
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-0.5"
                      role="img"
                      aria-label={t("facts.ratingValue", {
                        rating: ticket.rating,
                      })}
                    >
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          aria-hidden
                          className={
                            index < (ticket.rating ?? 0)
                              ? "size-4 fill-amber-400 text-amber-500"
                              : "text-muted-foreground/40 size-4"
                          }
                        />
                      ))}
                    </span>
                  )}
                </Fact>
              </dl>
              {ticket.rating_comment && (
                <blockquote className="text-muted-foreground border-l-2 pl-3 text-sm break-words whitespace-pre-line italic">
                  {ticket.rating_comment}
                </blockquote>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-medium">{t("facts.context")}</h3>
                {context.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("facts.noContext")}
                  </p>
                ) : (
                  <dl className="bg-muted/40 space-y-1.5 rounded-lg border p-3 font-mono text-xs">
                    {context.map((entry) => (
                      <div key={entry.key} className="min-w-0">
                        <dt className="text-muted-foreground break-all">
                          {entry.key}
                        </dt>
                        <dd className="break-all">{entry.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("detail.otherRequests")}</CardTitle>
            </CardHeader>
            <CardContent>
              {others.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("detail.noOtherRequests")}
                </p>
              ) : (
                <ul className="-mx-2 space-y-1">
                  {others.map((other) => (
                    <li key={other.id}>
                      <Link
                        href={`${BASE}/${other.id}`}
                        prefetch={false}
                        className="hover:bg-muted focus-visible:ring-ring/50 block rounded-md px-2 py-1.5 focus-visible:ring-3 focus-visible:outline-none"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground font-mono text-xs tabular-nums">
                            {ticketLabel(other)}
                          </span>
                          <TicketStatusBadge status={other.status} />
                        </span>
                        <span
                          className="block truncate text-sm font-medium"
                          title={other.subject}
                        >
                          {other.subject}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {when(other.created_at)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
