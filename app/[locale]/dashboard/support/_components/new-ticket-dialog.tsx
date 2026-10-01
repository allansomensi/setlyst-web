"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Clock, Loader2, Plus } from "lucide-react";
import { useAppRouter } from "@/hooks/use-app-router";
import { usePathname } from "@/i18n/routing";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { GuardedDialog, useGuardedForm } from "@/components/ui/guarded-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { toastActionError } from "@/lib/action-toast";
import { fieldA11y, focusFirstError, type FieldErrors } from "@/lib/forms";
import {
  supportContext,
  supportTextLength,
  supportTicketHref,
  validateTicketDraft,
  type TicketDraft,
} from "@/lib/support";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  SUPPORT_MESSAGE_MAX,
  SUPPORT_SUBJECT_MAX,
  SUPPORT_SUBJECT_MIN,
  TICKET_CATEGORIES,
  type TicketCategory,
} from "@/types/operations";
import { createSupportTicket } from "../actions";

/** "New request": the button and the dialog it opens. */
export function NewTicketButton({
  variant = "default",
  className,
}: {
  variant?: "default" | "outline";
  className?: string;
}) {
  const t = useTranslations("support");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Plus aria-hidden />
        {t("newRequest")}
      </Button>
      <GuardedDialog
        open={open}
        onClose={() => setOpen(false)}
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
      >
        <NewTicketForm onClose={() => setOpen(false)} />
      </GuardedDialog>
    </>
  );
}

const FIELD_ORDER = [
  { key: "subject", id: "ticket-subject" },
  { key: "category", id: "ticket-category" },
  { key: "body", id: "ticket-body" },
] as const satisfies readonly { key: keyof TicketDraft; id: string }[];

function NewTicketForm({ onClose }: { onClose: () => void }) {
  const t = useTranslations("support");
  const tForm = useTranslations("support.form");
  const tCommon = useTranslations("common");
  const router = useAppRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<FieldErrors<keyof TicketDraft>>({});
  // Too many requests open (or opened today): said inside the dialog, so
  // what was typed stays there to send later.
  const [limitError, setLimitError] = useState<string | null>(null);

  const isDirty = subject !== "" || category !== "" || body !== "";
  const requestClose = useGuardedForm({ isDirty, isPending }, onClose);

  const clearError = (field: keyof TicketDraft) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isPending) return;

    const draft = { subject, category, body };
    const found = validateTicketDraft(draft);
    const nextErrors: FieldErrors<keyof TicketDraft> = {};
    for (const [field, key] of Object.entries(found)) {
      nextErrors[field as keyof TicketDraft] = tForm(key, {
        min: SUPPORT_SUBJECT_MIN,
        max: field === "subject" ? SUPPORT_SUBJECT_MAX : SUPPORT_MESSAGE_MAX,
      });
    }
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      focusFirstError(nextErrors, FIELD_ORDER);
      return;
    }
    setErrors({});
    setLimitError(null);

    startTransition(async () => {
      const result = await createSupportTicket({
        subject,
        category: category as TicketCategory,
        body,
        context: supportContext(
          pathname,
          typeof navigator === "undefined" ? null : navigator.userAgent,
        ),
      });
      if (!result.success) {
        if (result.apiCode === "SUPPORT_TICKET_LIMIT") {
          setLimitError(result.error);
          return;
        }
        toastActionError(result, result.error || tForm("failed"));
        return;
      }
      const ticket = result.data?.ticket;
      toast.success(
        ticket ? t("created", { number: String(ticket.number) }) : t("sent"),
      );
      onClose();
      if (ticket) router.push(supportTicketHref(ticket.id));
    });
  };

  const subjectLength = supportTextLength(subject);
  const bodyLength = supportTextLength(body);

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader>
        <DialogTitle>{tForm("title")}</DialogTitle>
        <DialogDescription>{tForm("description")}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {limitError && (
          <Alert variant="warning" role="alert">
            <Clock aria-hidden />
            <AlertDescription>{limitError}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="ticket-subject">{tForm("subjectLabel")} *</Label>
            <span
              className={cn(
                "text-muted-foreground text-xs tabular-nums",
                subjectLength > SUPPORT_SUBJECT_MAX && "text-destructive",
              )}
            >
              {subjectLength}/{SUPPORT_SUBJECT_MAX}
            </span>
          </div>
          <Input
            id="ticket-subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              clearError("subject");
            }}
            maxLength={SUPPORT_SUBJECT_MAX}
            required
            aria-required
            disabled={isPending}
            placeholder={tForm("subjectPlaceholder")}
            {...fieldA11y("ticket-subject", errors.subject)}
          />
          <FieldError fieldId="ticket-subject" message={errors.subject} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ticket-category">{tForm("categoryLabel")} *</Label>
          <NativeSelect
            id="ticket-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as TicketCategory | "");
              clearError("category");
            }}
            required
            aria-required
            disabled={isPending}
            {...fieldA11y("ticket-category", errors.category)}
          >
            <option value="" disabled>
              {tForm("categoryPlaceholder")}
            </option>
            {TICKET_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {t(`category.${value}`)}
              </option>
            ))}
          </NativeSelect>
          <FieldError fieldId="ticket-category" message={errors.category} />
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="ticket-body">{tForm("messageLabel")} *</Label>
            <span
              className={cn(
                "text-muted-foreground text-xs tabular-nums",
                bodyLength > SUPPORT_MESSAGE_MAX && "text-destructive",
              )}
            >
              {bodyLength}/{SUPPORT_MESSAGE_MAX}
            </span>
          </div>
          <Textarea
            id="ticket-body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              clearError("body");
            }}
            maxLength={SUPPORT_MESSAGE_MAX}
            rows={6}
            required
            aria-required
            disabled={isPending}
            placeholder={tForm("messagePlaceholder")}
            {...fieldA11y("ticket-body", errors.body, "ticket-body-hint")}
          />
          <FieldError fieldId="ticket-body" message={errors.body} />
          <p id="ticket-body-hint" className="text-muted-foreground text-xs">
            {tForm("privacyHint")}
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={requestClose}
          disabled={isPending}
        >
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          )}
          {tForm("submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}
