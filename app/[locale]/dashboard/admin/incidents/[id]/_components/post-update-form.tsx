"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import { fieldA11y, onFormSubmit } from "@/lib/forms";
import {
  INCIDENT_TEXT_MAX,
  isValidIncidentText,
  updateIncidentStatuses,
} from "@/lib/platform-admin";
import { toast } from "@/lib/toast";
import type { Incident, IncidentStatus } from "@/types/operations";
import { postIncidentUpdate } from "../../actions";

/**
 * A new entry on the incident's public timeline, moving it to the chosen
 * status (`resolved` closes it). Defaults to the current status, for a
 * progress note that changes nothing else.
 */
export function PostUpdateForm({ incident }: { incident: Incident }) {
  const t = useTranslations("incidentsAdmin");
  const router = useRouter();
  const statuses = updateIncidentStatuses(incident.kind);
  const [status, setStatus] = useState<IncidentStatus>(
    statuses.includes(incident.status) ? incident.status : statuses[0],
  );
  const [body, setBody] = useState("");
  const [showError, setShowError] = useState(false);
  const [pending, startTransition] = useTransition();

  const error =
    showError && !isValidIncidentText(body)
      ? t("form.messageError", { max: INCIDENT_TEXT_MAX })
      : undefined;
  const reopening = incident.status === "resolved" && status !== "resolved";

  const submit = () => {
    if (!isValidIncidentText(body)) {
      setShowError(true);
      document.getElementById("update-body")?.focus();
      return;
    }
    startTransition(async () => {
      const result = await postIncidentUpdate(incident.id, {
        status,
        body: body.trim(),
      });
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(
        status === "resolved" ? t("update.resolved") : t("update.posted"),
      );
      setBody("");
      setShowError(false);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("update.title")}</CardTitle>
        <CardDescription>{t("update.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onFormSubmit(submit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="update-status">{t("form.status")}</Label>
            <NativeSelect
              id="update-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as IncidentStatus)}
              wrapperClassName="sm:max-w-xs"
              aria-describedby="update-status-hint"
            >
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {t(`statuses.${value}`)}
                </option>
              ))}
            </NativeSelect>
            <p
              id="update-status-hint"
              className={
                reopening
                  ? "text-xs text-amber-700 dark:text-amber-300"
                  : "text-muted-foreground text-xs"
              }
            >
              {reopening ? t("update.reopens") : t(`statusHints.${status}`)}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="update-body">{t("update.message")}</Label>
            <Textarea
              id="update-body"
              rows={4}
              value={body}
              maxLength={INCIDENT_TEXT_MAX}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("update.placeholder")}
              {...fieldA11y("update-body", error, "update-body-hint")}
            />
            <FieldError fieldId="update-body" message={error} />
            <p
              id="update-body-hint"
              className="text-muted-foreground flex justify-between gap-2 text-xs"
            >
              <span>{t("update.hint")}</span>
              <span className="shrink-0 tabular-nums">
                {body.length}/{INCIDENT_TEXT_MAX}
              </span>
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Send aria-hidden />
              )}
              {t("update.submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
