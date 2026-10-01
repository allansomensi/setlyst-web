"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceChips } from "@/components/staff/choice-chips";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import {
  isBeforeUtc,
  localInputFromNow,
  localInputToUtcNaive,
  utcNaiveToLocalInput,
} from "@/lib/datetime-local";
import {
  fieldA11y,
  focusFirstError,
  onFormSubmit,
  type FieldErrors,
} from "@/lib/forms";
import {
  INCIDENT_TEXT_MAX,
  INCIDENT_TITLE_MAX,
  INCIDENT_TITLE_MIN,
  initialIncidentStatuses,
  isValidIncidentText,
  isValidIncidentTitle,
  type UpdateIncidentPayload,
} from "@/lib/platform-admin";
import { toast } from "@/lib/toast";
import {
  INCIDENT_COMPONENTS,
  INCIDENT_IMPACTS,
  INCIDENT_KINDS,
  type Incident,
  type IncidentImpact,
  type IncidentKind,
  type IncidentStatus,
} from "@/types/operations";
import { createIncident, updateIncident } from "../actions";

type FieldKey = "title" | "from" | "until" | "message";

/** Where focus goes on a failed submit: the first invalid field. */
const FIELD_ORDER: { key: FieldKey; id: string }[] = [
  { key: "title", id: "incident-title" },
  { key: "from", id: "incident-from" },
  { key: "until", id: "incident-until" },
  { key: "message", id: "incident-message" },
];

// ------------------------------------------------------------------ create

export function CreateIncidentButton() {
  const t = useTranslations("incidentsAdmin");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        {t("new")}
      </Button>
      {open && <IncidentDialog onClose={() => setOpen(false)} />}
    </>
  );
}

/**
 * Publishes an incident or schedules maintenance (no `incident`), or
 * edits one's title, impact, components and window. Status changes go
 * through timeline updates instead (see PostUpdateForm).
 */
export function IncidentDialog({
  incident,
  onClose,
}: {
  incident?: Incident;
  onClose: () => void;
}) {
  const t = useTranslations("incidentsAdmin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = incident !== undefined;
  const initialFrom = utcNaiveToLocalInput(incident?.scheduled_for);
  const initialUntil = utcNaiveToLocalInput(incident?.scheduled_until);

  const [kind, setKind] = useState<IncidentKind>(incident?.kind ?? "incident");
  const [title, setTitle] = useState(incident?.title ?? "");
  const [impact, setImpact] = useState<IncidentImpact>(
    incident?.impact ?? "minor",
  );
  const [components, setComponents] = useState<string[]>(
    incident?.components ?? [],
  );
  const [status, setStatus] = useState<IncidentStatus>(
    initialIncidentStatuses(incident?.kind ?? "incident")[0],
  );
  const [from, setFrom] = useState(initialFrom);
  const [until, setUntil] = useState(initialUntil);
  const [message, setMessage] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const fromUtc = localInputToUtcNaive(from);
  const untilUtc = localInputToUtcNaive(until);
  const needsWindow = kind === "maintenance";
  // The window fields only show for maintenance (and when editing): a
  // window prefilled for maintenance and left behind by switching back to
  // "incident" must neither be sent nor block the form unseen.
  const windowShown = needsWindow || editing;
  const windowBackwards = Boolean(
    windowShown && fromUtc && untilUtc && !isBeforeUtc(fromUtc, untilUtc),
  );
  const errors: FieldErrors<FieldKey> = {
    title: isValidIncidentTitle(title)
      ? undefined
      : t("form.titleError", {
          min: INCIDENT_TITLE_MIN,
          max: INCIDENT_TITLE_MAX,
        }),
    from: needsWindow && !fromUtc ? t("form.windowRequired") : undefined,
    until:
      needsWindow && !untilUtc
        ? t("form.windowRequired")
        : windowBackwards
          ? t("form.windowOrder")
          : undefined,
    message:
      !editing && !isValidIncidentText(message)
        ? t("form.messageError", { max: INCIDENT_TEXT_MAX })
        : undefined,
  };
  const shown = (key: FieldKey) => (showErrors ? errors[key] : undefined);

  const changeKind = (next: IncidentKind) => {
    setKind(next);
    setStatus(initialIncidentStatuses(next)[0]);
    // Maintenance needs a window: start from a sensible one.
    if (next === "maintenance") {
      if (!from) setFrom(localInputFromNow(60));
      if (!until) setUntil(localInputFromNow(120));
    }
  };

  const submit = () => {
    setShowErrors(true);
    if (Object.values(errors).some(Boolean)) {
      focusFirstError(errors, FIELD_ORDER);
      return;
    }
    startTransition(async () => {
      if (incident) {
        const payload: UpdateIncidentPayload = {
          title: title.trim(),
          impact,
          components,
        };
        // Only a window that was touched: a round trip through the
        // minute-precision input must not rewrite the stored seconds.
        if (from !== initialFrom) payload.scheduled_for = fromUtc;
        if (until !== initialUntil) payload.scheduled_until = untilUtc;
        const result = await updateIncident(incident.id, payload);
        if (!result.success) {
          toastActionError(result, result.error);
          return;
        }
        toast.success(t("updated"));
        onClose();
        router.refresh();
        return;
      }

      const result = await createIncident({
        kind,
        title: title.trim(),
        impact,
        status,
        components,
        scheduled_for: needsWindow ? fromUtc : null,
        scheduled_until: needsWindow ? untilUtc : null,
        message: message.trim(),
      });
      if (!result.success || !result.data) {
        toastActionError(
          result,
          result.success ? t("saveFailed") : result.error,
        );
        return;
      }
      toast.success(kind === "maintenance" ? t("scheduled") : t("published"));
      onClose();
      router.push(`/dashboard/admin/incidents/${result.data.id}`);
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("form.editTitle") : t("form.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {editing ? t("form.editDescription") : t("form.createDescription")}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onFormSubmit(submit)} noValidate>
          {!editing && (
            <div className="space-y-1.5">
              <Label htmlFor="incident-kind">{t("form.kind")}</Label>
              <NativeSelect
                id="incident-kind"
                value={kind}
                onChange={(e) => changeKind(e.target.value as IncidentKind)}
                aria-describedby="incident-kind-hint"
              >
                {INCIDENT_KINDS.map((value) => (
                  <option key={value} value={value}>
                    {t(`kinds.${value}`)}
                  </option>
                ))}
              </NativeSelect>
              <p
                id="incident-kind-hint"
                className="text-muted-foreground text-xs"
              >
                {t(`form.kindHints.${kind}`)}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="incident-title">{t("form.title")}</Label>
            <Input
              id="incident-title"
              autoFocus
              value={title}
              maxLength={INCIDENT_TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t(`form.titlePlaceholders.${kind}`)}
              {...fieldA11y("incident-title", shown("title"))}
            />
            <FieldError fieldId="incident-title" message={shown("title")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="incident-impact">{t("form.impact")}</Label>
              <NativeSelect
                id="incident-impact"
                value={impact}
                onChange={(e) => setImpact(e.target.value as IncidentImpact)}
                aria-describedby="incident-impact-hint"
              >
                {INCIDENT_IMPACTS.map((value) => (
                  <option key={value} value={value}>
                    {t(`impacts.${value}`)}
                  </option>
                ))}
              </NativeSelect>
              <p
                id="incident-impact-hint"
                className="text-muted-foreground text-xs"
              >
                {t(`form.impactHints.${impact}`)}
              </p>
            </div>
            {!editing && kind === "incident" && (
              <div className="space-y-1.5">
                <Label htmlFor="incident-status">{t("form.status")}</Label>
                <NativeSelect
                  id="incident-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as IncidentStatus)}
                  aria-describedby="incident-status-hint"
                >
                  {initialIncidentStatuses(kind).map((value) => (
                    <option key={value} value={value}>
                      {t(`statuses.${value}`)}
                    </option>
                  ))}
                </NativeSelect>
                <p
                  id="incident-status-hint"
                  className="text-muted-foreground text-xs"
                >
                  {t(`statusHints.${status}`)}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium" aria-hidden>
              {t("form.components")}
            </span>
            <ChoiceChips
              label={t("form.components")}
              options={INCIDENT_COMPONENTS.map((value) => ({
                value,
                label: t(`components.${value}`),
              }))}
              value={components}
              onChange={(next) =>
                // Kept in the API's order, whatever the click order.
                setComponents(
                  INCIDENT_COMPONENTS.filter((c) => next.includes(c)),
                )
              }
              emptyLabel={t("form.componentsEmpty")}
            />
          </div>

          {windowShown && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                {t("form.window")}
                {!needsWindow && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    ({tCommon("optional")})
                  </span>
                )}
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="incident-from" className="text-xs">
                    {t("form.windowFrom")}
                  </Label>
                  <Input
                    id="incident-from"
                    type="datetime-local"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    {...fieldA11y("incident-from", shown("from"))}
                  />
                  <FieldError fieldId="incident-from" message={shown("from")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="incident-until" className="text-xs">
                    {t("form.windowUntil")}
                  </Label>
                  <Input
                    id="incident-until"
                    type="datetime-local"
                    value={until}
                    onChange={(e) => setUntil(e.target.value)}
                    {...fieldA11y("incident-until", shown("until"))}
                  />
                  <FieldError
                    fieldId="incident-until"
                    message={shown("until")}
                  />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("form.windowHint")}
              </p>
            </fieldset>
          )}

          {!editing && (
            <div className="space-y-1.5">
              <Label htmlFor="incident-message">{t("form.message")}</Label>
              <Textarea
                id="incident-message"
                rows={4}
                value={message}
                maxLength={INCIDENT_TEXT_MAX}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t(`form.messagePlaceholders.${kind}`)}
                {...fieldA11y(
                  "incident-message",
                  shown("message"),
                  "incident-message-hint",
                )}
              />
              <FieldError
                fieldId="incident-message"
                message={shown("message")}
              />
              <p
                id="incident-message-hint"
                className="text-muted-foreground flex justify-between gap-2 text-xs"
              >
                <span>{t("form.messageHint")}</span>
                <span className="shrink-0 tabular-nums">
                  {message.length}/{INCIDENT_TEXT_MAX}
                </span>
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {editing
                ? tCommon("save")
                : kind === "maintenance"
                  ? t("form.schedule")
                  : t("form.publish")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
