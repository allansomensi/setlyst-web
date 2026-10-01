"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Lock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toastActionError } from "@/lib/action-toast";
import { fieldA11y } from "@/lib/forms";
import { supportTextLength, validateSupportMessage } from "@/lib/support";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { SUPPORT_MESSAGE_MAX } from "@/types/operations";
import { replyToSupportTicket } from "../../actions";
import { NewTicketButton } from "../../_components/new-ticket-dialog";

/**
 * The reply box under the conversation. A closed request keeps it on
 * screen, disabled, with why and the way forward (a new request).
 */
export function ReplyForm({
  ticketId,
  closed,
  resolved,
}: {
  ticketId: string;
  closed: boolean;
  /** Replying to a resolved request opens it again: said under the box. */
  resolved: boolean;
}) {
  const t = useTranslations("support.reply");
  const tForm = useTranslations("support.form");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const length = supportTextLength(body);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isPending || closed) return;
    const problem = validateSupportMessage(body);
    if (problem) {
      setError(tForm(problem, { max: SUPPORT_MESSAGE_MAX }));
      document.getElementById("support-reply")?.focus();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await replyToSupportTicket(ticketId, body);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      setBody("");
      toast.success(t("sent"));
    });
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="bg-card space-y-3 rounded-xl border p-4 shadow-(--shadow-surface)"
    >
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor="support-reply">{t("label")}</Label>
        {!closed && (
          <span
            className={cn(
              "text-muted-foreground text-xs tabular-nums",
              length > SUPPORT_MESSAGE_MAX && "text-destructive",
            )}
          >
            {length}/{SUPPORT_MESSAGE_MAX}
          </span>
        )}
      </div>
      <Textarea
        id="support-reply"
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          if (error) setError(null);
        }}
        rows={4}
        maxLength={SUPPORT_MESSAGE_MAX}
        disabled={closed || isPending}
        placeholder={closed ? undefined : t("placeholder")}
        {...fieldA11y(
          "support-reply",
          error,
          closed ? "support-reply-closed" : "support-reply-hint",
        )}
      />
      <FieldError fieldId="support-reply" message={error} />
      {closed ? (
        <div
          id="support-reply-closed"
          className="text-muted-foreground flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {t("closed")}
          </p>
          <NewTicketButton variant="outline" className="shrink-0" />
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id="support-reply-hint" className="text-muted-foreground text-xs">
            {resolved ? t("reopensHint") : t("hint")}
          </p>
          <Button type="submit" disabled={isPending} className="shrink-0">
            {isPending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Send aria-hidden />
            )}
            {t("submit")}
          </Button>
        </div>
      )}
    </form>
  );
}
