"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Construction,
  Loader2,
  PencilOff,
  Save,
  type LucideIcon,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ClientDate } from "@/components/client-date";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import {
  localInputToUtcNaive,
  utcNaiveToLocalInput,
} from "@/lib/datetime-local";
import { fieldA11y } from "@/lib/forms";
import {
  BLOCKED_DOMAINS_MAX,
  formatDomainList,
  MAINTENANCE_MESSAGE_MAX,
  parseDomainList,
} from "@/lib/platform-admin";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  MAINTENANCE_MODES,
  type MaintenanceMode,
  type PlatformSettings,
} from "@/types/operations";
import { savePlatformSettings } from "../actions";

const MODE_STYLES: Record<
  MaintenanceMode,
  { icon: LucideIcon; selected: string; iconTone: string }
> = {
  off: {
    icon: CheckCircle2,
    selected: "border-emerald-500/60 bg-emerald-500/5",
    iconTone: "text-emerald-600 dark:text-emerald-400",
  },
  read_only: {
    icon: PencilOff,
    selected: "border-amber-500/60 bg-amber-500/5",
    iconTone: "text-amber-600 dark:text-amber-400",
  },
  full: {
    icon: Construction,
    selected: "border-red-500/60 bg-red-500/5",
    iconTone: "text-red-600 dark:text-red-400",
  },
};

interface Draft {
  mode: MaintenanceMode;
  message: string;
  /** `datetime-local` value, in the viewer's zone. */
  endsAt: string;
  registrationsOpen: boolean;
  domains: string;
}

function draftOf(settings: PlatformSettings): Draft {
  return {
    mode: settings.maintenance.mode,
    message: settings.maintenance.message ?? "",
    endsAt: utcNaiveToLocalInput(settings.maintenance.ends_at),
    registrationsOpen: settings.registrations_open,
    domains: formatDomainList(settings.blocked_email_domains),
  };
}

/**
 * What the API is sent. Turning maintenance off drops its message and
 * expected end, so the next maintenance doesn't start with stale ones.
 */
function payloadOf(draft: Draft, startedAt: string | null): PlatformSettings {
  const on = draft.mode !== "off";
  return {
    maintenance: {
      mode: draft.mode,
      message: on ? draft.message.trim() || null : null,
      ends_at: on ? localInputToUtcNaive(draft.endsAt) : null,
      started_at: startedAt,
    },
    registrations_open: draft.registrationsOpen,
    blocked_email_domains: parseDomainList(draft.domains).domains,
  };
}

/**
 * The platform switches: maintenance mode, sign-ups and blocked e-mail
 * domains. Read-only for moderators (`canEdit`). Switching to full
 * maintenance asks for confirmation: it signs everyone but staff out of
 * the app at once.
 */
export function PlatformSettingsForm({
  initial,
  canEdit,
}: {
  initial: PlatformSettings;
  canEdit: boolean;
}) {
  const t = useTranslations("platformAdmin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [draft, setDraft] = useState(() => draftOf(initial));
  const [confirmingFull, setConfirmingFull] = useState(false);
  // The API's own verdict on the domains (normally caught here first).
  const [serverDomainsError, setServerDomainsError] = useState(false);
  const [pending, startTransition] = useTransition();

  const startedAt = initial.maintenance.started_at;
  const payload = payloadOf(draft, startedAt);
  const dirty =
    JSON.stringify(payload) !==
    JSON.stringify(payloadOf(draftOf(initial), startedAt));
  const parsedDomains = parseDomainList(draft.domains);
  const tooManyDomains = parsedDomains.domains.length > BLOCKED_DOMAINS_MAX;
  const domainsError =
    parsedDomains.invalid.length > 0
      ? t("domains.invalid", {
          count: parsedDomains.invalid.length,
          domains: parsedDomains.invalid.slice(0, 5).join(", "),
        })
      : tooManyDomains
        ? t("domains.tooMany", { max: BLOCKED_DOMAINS_MAX })
        : serverDomainsError
          ? t("domains.serverInvalid")
          : undefined;
  const messageTooLong = draft.message.length > MAINTENANCE_MESSAGE_MAX;
  const valid = !domainsError && !messageTooLong;

  const update = (change: Partial<Draft>) =>
    setDraft((d) => ({ ...d, ...change }));

  const persist = () =>
    startTransition(async () => {
      const result = await savePlatformSettings(payload);
      if (!result.success) {
        const fields = (result.meta as { fields?: Record<string, unknown> })
          ?.fields;
        if (
          result.apiCode === "VALIDATION_ERROR" &&
          fields?.blocked_email_domains
        ) {
          setServerDomainsError(true);
          setConfirmingFull(false);
          document.getElementById("platform-domains")?.focus();
          return;
        }
        toastActionError(result, result.error);
        return;
      }
      setConfirmingFull(false);
      toast.success(t("saved"));
      // The page re-renders with what the API stored (and a fresh form).
      router.refresh();
    });

  const onSave = () => {
    if (!valid) {
      toast.error(t("invalid"));
      if (domainsError) document.getElementById("platform-domains")?.focus();
      return;
    }
    if (draft.mode === "full" && initial.maintenance.mode !== "full") {
      setConfirmingFull(true);
      return;
    }
    persist();
  };

  const savedModeOn = initial.maintenance.mode !== "off";

  return (
    <div className="space-y-6">
      <fieldset disabled={!canEdit || pending} className="min-w-0 space-y-6">
        {/* ------------------------------------------------ maintenance */}
        <Card>
          <CardHeader>
            <CardTitle id="maintenance-title">
              {t("maintenance.title")}
            </CardTitle>
            <CardDescription>{t("maintenance.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {savedModeOn && startedAt && (
              <p
                className={cn(
                  "flex flex-wrap items-center gap-x-1.5 rounded-lg border px-3 py-2 text-sm",
                  MODE_STYLES[initial.maintenance.mode].selected,
                )}
              >
                <AlertTriangle
                  className={cn(
                    "size-4 shrink-0",
                    MODE_STYLES[initial.maintenance.mode].iconTone,
                  )}
                  aria-hidden
                />
                {t.rich("maintenance.since", {
                  mode: t(
                    `maintenance.modes.${initial.maintenance.mode}.label`,
                  ),
                  date: () => (
                    <ClientDate
                      value={startedAt}
                      options={{ dateStyle: "medium", timeStyle: "short" }}
                      className="font-medium"
                    />
                  ),
                })}
              </p>
            )}

            <div
              role="radiogroup"
              aria-labelledby="maintenance-title"
              className="grid gap-3 md:grid-cols-3"
            >
              {MAINTENANCE_MODES.map((mode) => {
                const style = MODE_STYLES[mode];
                const Icon = style.icon;
                const selected = draft.mode === mode;
                return (
                  <label
                    key={mode}
                    className={cn(
                      "has-focus-visible:ring-ring/50 relative flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-colors has-focus-visible:ring-3 has-disabled:cursor-not-allowed has-disabled:opacity-70",
                      selected ? style.selected : "hover:bg-muted/50",
                    )}
                  >
                    <input
                      type="radio"
                      name="maintenance-mode"
                      value={mode}
                      checked={selected}
                      onChange={() => update({ mode })}
                      className="sr-only"
                      aria-describedby={`mode-${mode}-hint`}
                    />
                    <span className="flex items-center gap-2 font-semibold">
                      <Icon
                        className={cn("size-4 shrink-0", style.iconTone)}
                        aria-hidden
                      />
                      {t(`maintenance.modes.${mode}.label`)}
                      <span
                        aria-hidden
                        className={cn(
                          "ml-auto size-4 shrink-0 rounded-full border-2",
                          selected
                            ? "border-primary bg-primary shadow-[inset_0_0_0_2px_var(--background)]"
                            : "border-muted-foreground/40",
                        )}
                      />
                    </span>
                    <span
                      id={`mode-${mode}-hint`}
                      className="text-muted-foreground text-sm text-pretty"
                    >
                      {t(`maintenance.modes.${mode}.hint`)}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("maintenance.staffNote")}
            </p>

            {draft.mode !== "off" && (
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="space-y-1.5">
                  <Label htmlFor="maintenance-message">
                    {t("maintenance.message")}{" "}
                    <span className="text-muted-foreground font-normal">
                      ({tCommon("optional")})
                    </span>
                  </Label>
                  <Textarea
                    id="maintenance-message"
                    rows={3}
                    value={draft.message}
                    maxLength={MAINTENANCE_MESSAGE_MAX}
                    onChange={(e) => update({ message: e.target.value })}
                    placeholder={t("maintenance.messagePlaceholder")}
                    aria-describedby="maintenance-message-hint"
                  />
                  <div
                    id="maintenance-message-hint"
                    className="text-muted-foreground flex justify-between gap-2 text-xs"
                  >
                    <span>{t("maintenance.messageHint")}</span>
                    <span
                      className={cn(
                        "shrink-0 tabular-nums",
                        messageTooLong && "text-destructive",
                      )}
                    >
                      {draft.message.length}/{MAINTENANCE_MESSAGE_MAX}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maintenance-ends">
                    {t("maintenance.endsAt")}{" "}
                    <span className="text-muted-foreground font-normal">
                      ({tCommon("optional")})
                    </span>
                  </Label>
                  <Input
                    id="maintenance-ends"
                    type="datetime-local"
                    value={draft.endsAt}
                    onChange={(e) => update({ endsAt: e.target.value })}
                    aria-describedby="maintenance-ends-hint"
                    // The value is in the viewer's zone: the server
                    // rendered it in its own.
                    suppressHydrationWarning
                  />
                  <p
                    id="maintenance-ends-hint"
                    className="text-muted-foreground text-xs"
                  >
                    {t("maintenance.endsAtHint")}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* --------------------------------------------------- sign-ups */}
        <Card>
          <CardHeader>
            <CardTitle>{t("signups.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="registrations-open">{t("signups.label")}</Label>
                <p
                  id="registrations-open-hint"
                  className="text-muted-foreground text-sm"
                >
                  {draft.registrationsOpen
                    ? t("signups.openHint")
                    : t("signups.closedHint")}
                </p>
                {draft.mode !== "off" && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {t("signups.maintenanceNote")}
                  </p>
                )}
              </div>
              <Switch
                id="registrations-open"
                checked={draft.registrationsOpen}
                onCheckedChange={(registrationsOpen) =>
                  update({ registrationsOpen })
                }
                aria-describedby="registrations-open-hint"
              />
            </div>
          </CardContent>
        </Card>

        {/* ---------------------------------------------- blocked domains */}
        <Card>
          <CardHeader>
            <CardTitle>{t("domains.title")}</CardTitle>
            <CardDescription>{t("domains.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="platform-domains">{t("domains.label")}</Label>
              <span
                className={cn(
                  "text-muted-foreground text-xs tabular-nums",
                  tooManyDomains && "text-destructive",
                )}
                aria-live="polite"
              >
                {t("domains.count", {
                  count: parsedDomains.domains.length,
                  max: BLOCKED_DOMAINS_MAX,
                })}
              </span>
            </div>
            <Textarea
              id="platform-domains"
              rows={8}
              value={draft.domains}
              onChange={(e) => {
                update({ domains: e.target.value });
                setServerDomainsError(false);
              }}
              placeholder={t("domains.placeholder")}
              className="max-h-96 font-mono text-sm"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              {...fieldA11y("platform-domains", domainsError, "domains-hint")}
            />
            <FieldError fieldId="platform-domains" message={domainsError} />
            <p id="domains-hint" className="text-muted-foreground text-xs">
              {t("domains.hint")}
            </p>
          </CardContent>
        </Card>
      </fieldset>

      {canEdit && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {dirty && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraft(draftOf(initial));
                setServerDomainsError(false);
              }}
              disabled={pending}
            >
              {t("reset")}
            </Button>
          )}
          <Button onClick={onSave} disabled={!dirty || pending}>
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Save aria-hidden />
            )}
            {t("save")}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmingFull}
        onOpenChange={setConfirmingFull}
        title={t("confirmFull.title")}
        description={
          <div className="space-y-3">
            <p>{t("confirmFull.lead")}</p>
            <ul className="list-disc space-y-1 pl-5">
              {(["signedOut", "signIn", "signUp", "staff"] as const).map(
                (key) => (
                  <li key={key}>{t(`confirmFull.consequences.${key}`)}</li>
                ),
              )}
            </ul>
          </div>
        }
        confirmLabel={t("confirmFull.confirm")}
        destructive
        pending={pending}
        onConfirm={persist}
      />
    </div>
  );
}
