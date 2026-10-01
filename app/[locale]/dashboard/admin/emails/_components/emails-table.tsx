"use client";

import { useState, useTransition } from "react";
import { Ban, Loader2, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientDate } from "@/components/client-date";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { Link, useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import {
  canCancelEmail,
  canRetryEmail,
  OUTBOX_STATUS_TONES,
} from "@/lib/platform-admin";
import { toast } from "@/lib/toast";
import type { OutboxEmail } from "@/types/operations";
import { cancelEmail, retryEmail } from "../actions";

const DATE_TIME: Intl.DateTimeFormatOptions = {
  dateStyle: "short",
  timeStyle: "short",
};

/** Errors longer than this start collapsed. */
const ERROR_PREVIEW = 80;

function LastError({ id, text }: { id: string; text: string }) {
  const t = useTranslations("emailsAdmin");
  const [expanded, setExpanded] = useState(false);
  if (text.length <= ERROR_PREVIEW) {
    return <span className="break-words">{text}</span>;
  }
  return (
    <span className="block space-y-0.5">
      <span
        id={`email-error-${id}`}
        className={expanded ? "block break-words" : "line-clamp-2 break-all"}
        title={expanded ? undefined : text}
      >
        {text}
      </span>
      <button
        type="button"
        className="text-primary focus-visible:ring-ring/50 rounded-sm text-xs font-medium outline-none hover:underline focus-visible:ring-3"
        aria-expanded={expanded}
        aria-controls={`email-error-${id}`}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? t("table.showLess") : t("table.showMore")}
      </button>
    </span>
  );
}

/**
 * The outbox, newest first. Admins (`canWrite`) can queue a failed or
 * skipped e-mail again or cancel one still waiting.
 */
export function EmailsTable({
  emails,
  canWrite,
}: {
  emails: OutboxEmail[];
  canWrite: boolean;
}) {
  const t = useTranslations("emailsAdmin");
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<OutboxEmail | null>(null);
  const [pending, startTransition] = useTransition();

  const retry = (email: OutboxEmail) => {
    setBusyId(email.id);
    startTransition(async () => {
      const result = await retryEmail(email.id);
      setBusyId(null);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("table.retried", { to: email.to_email }));
      router.refresh();
    });
  };

  const cancel = () =>
    startTransition(async () => {
      if (!canceling) return;
      const result = await cancelEmail(canceling.id);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("table.canceled"));
      setCanceling(null);
      router.refresh();
    });

  return (
    <>
      <div className="bg-card overflow-x-auto rounded-xl border shadow-(--shadow-surface)">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead className="hidden md:table-cell">
                {t("table.created")}
              </TableHead>
              <TableHead>{t("table.recipient")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t("table.template")}
              </TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                {t("table.attempts")}
              </TableHead>
              <TableHead className="hidden md:table-cell">
                {t("table.lastError")}
              </TableHead>
              {canWrite && (
                <TableHead className="w-0">
                  <span className="sr-only">{t("table.actions")}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {emails.map((email) => (
              <TableRow key={email.id}>
                <TableCell className="text-muted-foreground hidden align-top text-sm whitespace-nowrap md:table-cell">
                  <ClientDate value={email.created_at} options={DATE_TIME} />
                </TableCell>
                <TableCell className="max-w-64 min-w-40 align-top">
                  <p className="truncate text-sm" title={email.to_email}>
                    {email.to_email}
                  </p>
                  {email.user_id && (
                    <Link
                      href={`/dashboard/users/${email.user_id}`}
                      prefetch={false}
                      className="text-muted-foreground block truncate text-xs hover:underline"
                    >
                      @{email.username ?? t("table.unknownUser")}
                    </Link>
                  )}
                  {/* The columns hidden on a phone, folded in here. */}
                  <p className="text-muted-foreground mt-1 text-xs md:hidden">
                    <span className="font-mono">{email.template}</span>
                    {" · "}
                    <ClientDate value={email.created_at} options={DATE_TIME} />
                  </p>
                  {email.last_error && (
                    <p className="text-destructive mt-1 text-xs md:hidden">
                      <LastError id={`${email.id}-m`} text={email.last_error} />
                    </p>
                  )}
                </TableCell>
                <TableCell className="hidden align-top md:table-cell">
                  <span className="font-mono text-xs">{email.template}</span>
                  <span className="text-muted-foreground block text-xs">
                    {email.locale}
                  </span>
                </TableCell>
                <TableCell className="align-top">
                  <Badge
                    variant="outline"
                    className={OUTBOX_STATUS_TONES[email.status]}
                  >
                    {t(`statuses.${email.status}`)}
                  </Badge>
                  {email.sent_at && (
                    <span className="text-muted-foreground mt-1 block text-xs whitespace-nowrap">
                      <ClientDate value={email.sent_at} options={DATE_TIME} />
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden text-right align-top text-sm tabular-nums lg:table-cell">
                  {email.attempts}
                </TableCell>
                <TableCell className="text-muted-foreground hidden max-w-72 min-w-40 align-top text-xs md:table-cell">
                  {email.last_error ? (
                    <LastError id={email.id} text={email.last_error} />
                  ) : (
                    "—"
                  )}
                </TableCell>
                {canWrite && (
                  <TableCell className="align-top">
                    <div className="flex justify-end gap-1">
                      {canRetryEmail(email) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retry(email)}
                          disabled={pending}
                          aria-label={t("table.retryFor", {
                            to: email.to_email,
                          })}
                        >
                          {busyId === email.id ? (
                            <Loader2 className="animate-spin" aria-hidden />
                          ) : (
                            <RotateCw aria-hidden />
                          )}
                          {t("table.retry")}
                        </Button>
                      )}
                      {canCancelEmail(email) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setCanceling(email)}
                          disabled={pending}
                          aria-label={t("table.cancelFor", {
                            to: email.to_email,
                          })}
                        >
                          <Ban aria-hidden />
                          {t("table.cancel")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={canceling !== null}
        onOpenChange={(open) => !open && setCanceling(null)}
        title={t("table.cancelTitle")}
        description={t("table.cancelDescription", {
          to: canceling?.to_email ?? "",
          template: canceling?.template ?? "",
        })}
        confirmLabel={t("table.cancelConfirm")}
        destructive
        pending={pending}
        onConfirm={cancel}
      />
    </>
  );
}
