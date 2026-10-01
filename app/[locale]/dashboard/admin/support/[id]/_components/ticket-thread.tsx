import { useTranslations } from "next-intl";
import { Headset, Lock } from "lucide-react";
import { ClientDate } from "@/components/client-date";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import type { AdminSupportTicket, SupportMessage } from "@/types/operations";

const DATE_TIME = { dateStyle: "medium", timeStyle: "short" } as const;

/**
 * The whole conversation of a ticket, oldest first. The three kinds of
 * message read differently at a glance: the requester's on a neutral
 * surface, staff replies tinted with the brand colour and set off to the
 * right, internal notes in amber with a dashed border and a label saying
 * the requester never sees them.
 *
 * Hook-only (no `async`), rendered from the server page.
 */
export function TicketThread({
  ticket,
  messages,
}: {
  ticket: AdminSupportTicket;
  messages: SupportMessage[];
}) {
  const t = useTranslations("supportAdmin.thread");

  if (messages.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <ol className="space-y-4">
      {messages.map((message) => {
        const kind = message.internal
          ? "note"
          : message.from_staff
            ? "staff"
            : "requester";
        const author =
          kind === "requester"
            ? (message.author_username ?? ticket.username)
            : (message.author_username ?? t("formerStaff"));

        return (
          <li
            key={message.id}
            className={cn(
              "flex gap-3",
              kind === "staff" && "sm:ml-8",
              kind === "requester" && "sm:mr-8",
            )}
          >
            {kind === "requester" ? (
              <UserAvatar
                userId={ticket.user_id}
                name={author}
                avatarUrl={ticket.user_avatar_url}
                size="sm"
                className="mt-0.5"
              />
            ) : (
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full",
                  kind === "note"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : "bg-primary/10 text-primary",
                )}
              >
                {kind === "note" ? (
                  <Lock className="size-4" />
                ) : (
                  <Headset className="size-4" />
                )}
              </span>
            )}

            <article
              aria-label={t(`label.${kind}`, { username: author })}
              className={cn(
                "min-w-0 flex-1 rounded-xl border px-4 py-3",
                kind === "requester" && "bg-muted/50",
                kind === "staff" && "border-primary/25 bg-primary/5",
                kind === "note" &&
                  "border-dashed border-amber-500/50 bg-amber-500/5",
              )}
            >
              {kind === "note" && (
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <Lock className="size-3.5 shrink-0" aria-hidden />
                  {t("internalNote")}
                </p>
              )}
              <header className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                <span className="font-medium">@{author}</span>
                <span className="text-muted-foreground text-xs">
                  {t(`role.${kind}`)}
                </span>
                <ClientDate
                  value={message.created_at}
                  options={DATE_TIME}
                  className="text-muted-foreground ml-auto text-xs"
                />
              </header>
              <p className="text-sm break-words whitespace-pre-wrap">
                {message.body}
              </p>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
