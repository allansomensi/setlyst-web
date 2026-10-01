import { getTranslations } from "next-intl/server";
import {
  ChevronLeft,
  ChevronRight,
  LifeBuoy,
  Mail,
  MessageSquare,
} from "lucide-react";
import { ClientDate } from "@/components/client-date";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { Link } from "@/components/nav-link";
import { PageHeader } from "@/components/page-header";
import { TicketStatusBadge } from "@/components/support/ticket-status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchServerApi } from "@/lib/api-server";
import { SUPPORT_EMAIL } from "@/lib/links";
import { staticTitle } from "@/lib/page-metadata";
import {
  SUPPORT_HREF,
  formatTicketNumber,
  supportTicketHref,
} from "@/lib/support";
import { cn } from "@/lib/utils";
import type { PaginatedResponse } from "@/types/api";
import type { SupportTicket } from "@/types/operations";
import { NewTicketButton } from "./_components/new-ticket-dialog";

export async function generateMetadata() {
  return staticTitle("supportRequests");
}

const PER_PAGE = 20;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("support");
  const raw = await searchParams;
  const page = Math.max(1, Number.parseInt(first(raw.page) ?? "1", 10) || 1);
  const query = new URLSearchParams({
    page: String(page),
    per_page: String(PER_PAGE),
  });

  const result = await fetchServerApi<PaginatedResponse<SupportTicket>>(
    `/support/tickets?${query}`,
  ).catch(() => null);
  const tickets = result?.data ?? [];
  const total = result?.meta.total_items ?? 0;
  const totalPages = result?.meta.total_pages ?? 1;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={total > 0 && <NewTicketButton />}
      />

      {result === null ? (
        <LoadErrorNotice />
      ) : total === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          actions={<NewTicketButton />}
          className="bg-card rounded-xl border border-dashed"
        />
      ) : (
        <section aria-labelledby="support-requests" className="space-y-3">
          <h2 id="support-requests" className="sr-only">
            {t("listTitle")}
          </h2>
          <ul className="bg-card divide-y overflow-hidden rounded-xl border shadow-(--shadow-surface)">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <TicketRow
                  ticket={ticket}
                  statusLabel={t(`status.${ticket.status}`)}
                  categoryLabel={t(`category.${ticket.category}`)}
                  unreadLabel={t("unread")}
                  messagesLabel={t("messageCount", {
                    count: ticket.message_count,
                  })}
                  lastActivityLabel={t("lastActivity")}
                />
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} />
        </section>
      )}

      {/* The in-app request is the main way; e-mail stays for whoever
          can't use it (a locked account writes from outside). */}
      <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-center text-sm">
        <Mail className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          {t.rich("emailAlternative", {
            address: SUPPORT_EMAIL,
            email: (chunks) => (
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-foreground font-medium underline-offset-4 hover:underline"
              >
                {chunks}
              </a>
            ),
          })}
        </span>
      </p>
    </div>
  );
}

function TicketRow({
  ticket,
  statusLabel,
  categoryLabel,
  unreadLabel,
  messagesLabel,
  lastActivityLabel,
}: {
  ticket: SupportTicket;
  statusLabel: string;
  categoryLabel: string;
  unreadLabel: string;
  messagesLabel: string;
  lastActivityLabel: string;
}) {
  const unread = ticket.requester_unread;
  return (
    <Link
      href={supportTicketHref(ticket.id)}
      className={cn(
        "hover:bg-muted/50 focus-visible:ring-ring/50 flex items-start gap-3 px-4 py-3 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-inset",
        unread && "bg-primary/5",
      )}
    >
      {/* The dot is visual only: the label says it too. */}
      <span
        className={cn(
          "mt-2 h-2 w-2 shrink-0 rounded-full",
          unread ? "bg-primary" : "bg-transparent",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex min-w-0 items-baseline gap-2">
          <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
            {formatTicketNumber(ticket.number)}
          </span>
          <span
            className={cn(
              "truncate text-sm",
              unread ? "font-semibold" : "font-medium",
            )}
          >
            {unread && <span className="sr-only">{unreadLabel}: </span>}
            {ticket.subject}
          </span>
        </p>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          <span>{categoryLabel}</span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3 w-3" aria-hidden />
            {messagesLabel}
          </span>
          <span>
            {lastActivityLabel}{" "}
            <ClientDate
              value={ticket.last_message_at}
              options={{ dateStyle: "medium", timeStyle: "short" }}
            />
          </span>
        </p>
      </div>
      <TicketStatusBadge
        status={ticket.status}
        label={statusLabel}
        className="mt-0.5"
      />
    </Link>
  );
}

/** Previous/next through `?page=`, as plain links (no client code). */
async function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const t = await getTranslations("common");
  const tPagination = await getTranslations("pagination");
  const href = (target: number) =>
    target <= 1 ? SUPPORT_HREF : `${SUPPORT_HREF}?page=${target}`;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label={tPagination("label")}
      className="flex items-center justify-between gap-2 text-sm"
    >
      {hasPrev ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={href(page - 1)}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
            {t("previous")}
          </Link>
        </Button>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground tabular-nums" aria-current="page">
        {t("pageOf", { page: Math.min(page, totalPages), total: totalPages })}
      </span>
      {hasNext ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={href(page + 1)}>
            {t("next")}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
