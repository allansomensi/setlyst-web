"use client";

import { useId, useState, useTransition } from "react";
import { Info, Loader2, Lock, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { toastActionError } from "@/lib/action-toast";
import { defaultStatusAfterSend, type ComposerMode } from "@/lib/support-admin";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  SUPPORT_MESSAGE_MAX,
  TICKET_STATUSES,
  type TicketStatus,
} from "@/types/operations";
import { replyToTicket } from "../../actions";

/**
 * Answers the requester or leaves an internal note, and says what status
 * the ticket should be in afterwards (a reply hands it back to the
 * requester by default; a note leaves it alone). A closed ticket takes
 * notes only: the requester can't see or answer it any more.
 */
export function TicketComposer({
  ticketId,
  status,
}: {
  ticketId: string;
  status: TicketStatus;
}) {
  const t = useTranslations("supportAdmin.composer");
  const tStatus = useTranslations("supportAdmin.status");
  const id = useId();
  const closed = status === "closed";
  const [mode, setMode] = useState<ComposerMode>(closed ? "note" : "reply");
  const [body, setBody] = useState("");
  const [after, setAfter] = useState<TicketStatus | "">(
    defaultStatusAfterSend(closed ? "note" : "reply"),
  );
  const [isPending, startTransition] = useTransition();

  // The ticket was closed (from the side panel) while a reply was being
  // written: switch to a note rather than offering a send that fails.
  // Adjusted during render, React's "storing information from previous
  // renders" pattern.
  const effectiveMode: ComposerMode = closed ? "note" : mode;
  if (effectiveMode !== mode) {
    setMode(effectiveMode);
    setAfter(defaultStatusAfterSend(effectiveMode));
  }

  const isNote = effectiveMode === "note";
  const trimmed = body.trim();

  const switchMode = (next: ComposerMode) => {
    if (next === mode) return;
    setMode(next);
    setAfter(defaultStatusAfterSend(next));
  };

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!trimmed || isPending) return;
    startTransition(async () => {
      const result = await replyToTicket(ticketId, {
        body: trimmed,
        internal: isNote,
        status: after || null,
      });
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      setBody("");
      setAfter(defaultStatusAfterSend(effectiveMode));
      toast.success(isNote ? t("noteAdded") : t("replySent"));
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div
        role="group"
        aria-label={t("modeLabel")}
        className="bg-muted inline-flex rounded-lg p-1"
      >
        {(["reply", "note"] as const).map((value) => {
          const selected = value === effectiveMode;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              disabled={(value === "reply" && closed) || isPending}
              onClick={() => switchMode(value)}
              className={cn(
                "focus-visible:ring-ring/50 text-muted-foreground inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-all outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
                selected && "bg-background text-foreground shadow-sm",
              )}
            >
              {value === "reply" ? (
                <Send className="size-3.5" aria-hidden />
              ) : (
                <Lock className="size-3.5" aria-hidden />
              )}
              {t(`mode.${value}`)}
            </button>
          );
        })}
      </div>

      {closed && (
        <p className="text-muted-foreground flex gap-2 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("closedHint")}
        </p>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-body`}>
            {isNote ? t("noteLabel") : t("replyLabel")}
          </Label>
          <span className="text-muted-foreground text-xs tabular-nums">
            {body.length}/{SUPPORT_MESSAGE_MAX}
          </span>
        </div>
        <Textarea
          id={`${id}-body`}
          value={body}
          maxLength={SUPPORT_MESSAGE_MAX}
          rows={6}
          disabled={isPending}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={isNote ? t("notePlaceholder") : t("replyPlaceholder")}
          aria-describedby={`${id}-hint`}
          className={cn(
            isNote &&
              "border-dashed border-amber-500/60 bg-amber-500/5 dark:bg-amber-500/5",
          )}
        />
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {isNote ? t("noteHint") : t("replyHint")}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5 sm:w-64">
          <Label htmlFor={`${id}-status`}>{t("statusAfter")}</Label>
          <NativeSelect
            id={`${id}-status`}
            value={after}
            disabled={isPending}
            onChange={(event) =>
              setAfter(event.target.value as TicketStatus | "")
            }
          >
            {isNote && (
              <option value="">
                {t("unchanged", { status: tStatus(status) })}
              </option>
            )}
            {TICKET_STATUSES.map((value) => (
              <option key={value} value={value}>
                {tStatus(value)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button
          type="submit"
          disabled={!trimmed || isPending}
          className="sm:ml-auto"
        >
          {isPending ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : isNote ? (
            <Lock aria-hidden />
          ) : (
            <Send aria-hidden />
          )}
          {isNote ? t("addNote") : t("sendReply")}
        </Button>
      </div>
    </form>
  );
}
