"use client";

import { useState, useTransition } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toastActionError } from "@/lib/action-toast";
import { LIMITABLE_QUOTA_RESOURCES } from "@/lib/api-errors";
import type { QuotaResource } from "@/types/api";
import type {
  QuotaLimits,
  QuotaOverrides,
  UserQuotaSettings,
} from "@/types/api";
import { updateUserQuotas } from "../../actions";

/** Mirrors the API's bound for a single limit. */
const MAX_LIMIT = 1_000_000;

type Draft = Record<QuotaResource, string>;

function toDraft(overrides: QuotaOverrides): Draft {
  return Object.fromEntries(
    LIMITABLE_QUOTA_RESOURCES.map((r) => [
      r,
      overrides[r] != null ? String(overrides[r]) : "",
    ]),
  ) as Draft;
}

/**
 * Per-account limits (admin only). A blank field follows the platform
 * default shown as its placeholder; "Unlimited" lifts every limit for
 * this account.
 */
export function QuotaEditor({
  userId,
  settings,
  defaults,
}: {
  userId: string;
  settings: UserQuotaSettings;
  defaults: QuotaLimits | null;
}) {
  const t = useTranslations("staff.quotaEditor");
  const tQuota = useTranslations("quotas");
  const tCommon = useTranslations("common");
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings.overrides));
  const [unlimited, setUnlimited] = useState(settings.unlimited);
  const [isPending, startTransition] = useTransition();

  const invalid = LIMITABLE_QUOTA_RESOURCES.filter((r) => {
    const value = draft[r].trim();
    if (!value) return false;
    const n = Number(value);
    return !Number.isInteger(n) || n < 0 || n > MAX_LIMIT;
  });

  const dirty =
    unlimited !== settings.unlimited ||
    LIMITABLE_QUOTA_RESOURCES.some(
      (r) => draft[r].trim() !== (settings.overrides[r]?.toString() ?? ""),
    );

  const save = () => {
    const overrides: QuotaOverrides = {};
    for (const r of LIMITABLE_QUOTA_RESOURCES) {
      const value = draft[r].trim();
      overrides[r] = value ? Number(value) : null;
    }
    startTransition(async () => {
      const result = await updateUserQuotas(userId, overrides, unlimited);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("saved"));
    });
  };

  return (
    <div className="space-y-4">
      <label className="flex items-start justify-between gap-3 rounded-lg border p-3">
        <span className="space-y-0.5">
          <span className="block text-sm font-medium">{t("unlimited")}</span>
          <span className="text-muted-foreground block text-xs">
            {t("unlimitedHint")}
          </span>
        </span>
        <Switch checked={unlimited} onCheckedChange={setUnlimited} />
      </label>

      <div
        className={`grid gap-3 sm:grid-cols-2 ${unlimited ? "pointer-events-none opacity-50" : ""}`}
        aria-disabled={unlimited}
      >
        {LIMITABLE_QUOTA_RESOURCES.map((resource) => (
          <div key={resource} className="space-y-1">
            <label
              htmlFor={`quota-${resource}`}
              className="text-muted-foreground text-xs font-medium"
            >
              {tQuota(`resources.${resource}`)}
            </label>
            <Input
              id={`quota-${resource}`}
              inputMode="numeric"
              value={draft[resource]}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  [resource]: e.target.value.replace(/[^\d]/g, ""),
                }))
              }
              placeholder={
                defaults
                  ? t("defaultPlaceholder", { value: defaults[resource] })
                  : ""
              }
              aria-invalid={invalid.includes(resource)}
              disabled={unlimited}
            />
          </div>
        ))}
      </div>

      {invalid.length > 0 && (
        <p className="text-destructive text-sm">
          {t("invalid", { max: MAX_LIMIT })}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraft(toDraft({}));
            setUnlimited(false);
          }}
          disabled={isPending}
        >
          <RotateCcw className="mr-1.5 h-4 w-4" />
          {t("resetToDefaults")}
        </Button>
        <Button
          onClick={save}
          disabled={!dirty || invalid.length > 0 || isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {tCommon("save")}
        </Button>
      </div>
      {settings.updated_at && (
        <p className="text-muted-foreground text-xs">
          {t("lastChangedBy", {
            username: settings.updated_by_username ?? "—",
          })}
        </p>
      )}
    </div>
  );
}
