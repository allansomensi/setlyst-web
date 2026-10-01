import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { CircleCheck, Clock, Hourglass, Lock, Star } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { ClientDate } from "@/components/client-date";
import { DetailBackButton, DetailHeader } from "@/components/detail-header";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { TicketStatusBadge } from "@/components/support/ticket-status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserAvatar } from "@/components/user-avatar";
import { notFoundOnMissing } from "@/lib/api-not-found";
import { entityTitle } from "@/lib/page-metadata";
import { getMe, fetchServerApiOnce } from "@/lib/server-data";
import {
  SUPPORT_HREF,
  canCloseTicket,
  canRateTicket,
  canReplyToTicket,
  formatTicketNumber,
} from "@/lib/support";
import { isUuid } from "@/lib/uuid";
import { cn } from "@/lib/utils";
import type { User } from "@/types/api";
import type {
  SupportMessage,
  SupportTicketDetail,
  TicketStatus,
} from "@/types/operations";
import { CloseTicketButton } from "./_components/close-ticket-button";
import { RatingForm } from "./_components/rating-form";
import { ReplyForm } from "./_components/reply-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID is not a page of this app.
  if (!isUuid(id)) notFound();
  return entityTitle<SupportTicketDetail>(
    `/support/tickets/${id}`,
    (detail) =>
      `${formatTicketNumber(detail.ticket.number)} ${detail.ticket.subject}`,
    "supportRequest",
    "supportRequests",
  );
}

const STATUS_ICONS = {
  open: Clock,
  pending: Hourglass,
  resolved: CircleCheck,
  closed: Lock,
} satisfies Record<TicketStatus, unknown>;

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const t = await getTranslations("support");

  // Someone else's request (403) or one that doesn't exist is a 404, not
  // the error boundary. Loading it marks the team's replies as read.
  const [{ ticket, messages }, me] = await Promise.all([
    fetchServerApiOnce<SupportTicketDetail>(`/support/tickets/${id}`).catch(
      notFoundOnMissing,
    ),
    // Only for the requester's avatar beside their messages.
    getMe().catch(() => null),
  ]);

  const StatusIcon = STATUS_ICONS[ticket.status];
  const number = formatTicketNumber(ticket.number);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageBreadcrumbs
        items={[{ label: t("title"), href: SUPPORT_HREF }, { label: number }]}
      />

      <DetailHeader
        actions={
          canCloseTicket(ticket.status) && (
            <CloseTicketButton ticketId={ticket.id} />
          )
        }
      >
        <DetailBackButton href={SUPPORT_HREF} label={t("title")} />
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
            {ticket.subject}
          </h1>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <TicketStatusBadge
              status={ticket.status}
              label={t(`status.${ticket.status}`)}
            />
            <span className="font-mono tabular-nums">{number}</span>
            <span>{t(`category.${ticket.category}`)}</span>
            <span>
              {t("openedOn")}{" "}
              <ClientDate
                value={ticket.created_at}
                options={{ dateStyle: "medium", timeStyle: "short" }}
              />
            </span>
          </div>
        </div>
      </DetailHeader>

      <Alert variant={ticket.status === "pending" ? "warning" : "default"}>
        <StatusIcon aria-hidden />
        <AlertDescription>{t(`statusHint.${ticket.status}`)}</AlertDescription>
      </Alert>

      <section aria-labelledby="support-thread" className="space-y-4">
        <h2 id="support-thread" className="sr-only">
          {t("conversation")}
        </h2>
        <ol className="space-y-4">
          {messages.map((message) => (
            <li key={message.id}>
              <MessageBubble
                message={message}
                me={me}
                teamLabel={t("team")}
                youLabel={t("you")}
              />
            </li>
          ))}
        </ol>
      </section>

      {ticket.rating !== null ? (
        <GivenRating
          rating={ticket.rating}
          comment={ticket.rating_comment}
          title={t("rating.given")}
          label={t("rating.outOf", { rating: ticket.rating })}
        />
      ) : (
        canRateTicket(ticket) && <RatingForm ticketId={ticket.id} />
      )}

      <ReplyForm
        ticketId={ticket.id}
        closed={!canReplyToTicket(ticket.status)}
        resolved={ticket.status === "resolved"}
      />
    </div>
  );
}

/**
 * One message of the conversation, chat style: the requester's own on the
 * right, the team's on the left under the Setlyst icon.
 */
function MessageBubble({
  message,
  me,
  teamLabel,
  youLabel,
}: {
  message: SupportMessage;
  me: User | null;
  teamLabel: string;
  youLabel: string;
}) {
  const fromTeam = message.from_staff;
  return (
    <article
      className={cn("flex items-start gap-3", !fromTeam && "flex-row-reverse")}
    >
      {fromTeam ? (
        <span className="bg-card flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border">
          <AppLogo size={24} decorative />
        </span>
      ) : me ? (
        <UserAvatar
          userId={me.id}
          name={me.username}
          avatarUrl={me.avatar_url}
          size="sm"
        />
      ) : (
        <span className="h-8 w-8 shrink-0" aria-hidden />
      )}
      <div
        className={cn(
          "max-w-[85%] min-w-0 space-y-1 sm:max-w-[75%]",
          !fromTeam && "items-end text-right",
        )}
      >
        <header
          className={cn(
            "text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-xs",
            !fromTeam && "justify-end",
          )}
        >
          <span className="text-foreground font-medium">
            {fromTeam ? teamLabel : youLabel}
          </span>
          {fromTeam && message.author_username && (
            <span>@{message.author_username}</span>
          )}
          <ClientDate
            value={message.created_at}
            options={{ dateStyle: "medium", timeStyle: "short" }}
          />
        </header>
        <div
          className={cn(
            "rounded-2xl border px-4 py-2.5 text-left text-sm break-words whitespace-pre-line",
            fromTeam
              ? "bg-card rounded-tl-sm"
              : "bg-primary/10 border-primary/20 rounded-tr-sm",
          )}
        >
          {message.body}
        </div>
      </div>
    </article>
  );
}

/** The rating the requester already gave: read-only stars and comment. */
function GivenRating({
  rating,
  comment,
  title,
  label,
}: {
  rating: number;
  comment: string | null;
  title: string;
  label: string;
}) {
  return (
    <section className="bg-card space-y-2 rounded-xl border p-4 shadow-(--shadow-surface)">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="flex items-center gap-0.5">
        <span className="sr-only">{label}</span>
        {[1, 2, 3, 4, 5].map((value) => (
          <Star
            key={value}
            aria-hidden
            className={cn(
              "h-5 w-5",
              value <= rating
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/40",
            )}
          />
        ))}
      </p>
      {comment && (
        <p className="text-muted-foreground text-sm break-words whitespace-pre-line">
          {comment}
        </p>
      )}
    </section>
  );
}
