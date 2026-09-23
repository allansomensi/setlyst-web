"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { toastActionError } from "@/lib/action-toast";
import { QUOTA_RESOURCES, type QuotaResource } from "@/lib/api-errors";
import type { QuotaLimits } from "@/types/api";
import { updateQuotaDefaults } from "../../actions";

const MAX_LIMIT = 1_000_000;

/** Resources counted per account vs. per band / per setlist. */
const GROUPS: { key: "account" | "container"; resources: QuotaResource[] }[] = [
  {
    key: "account",
    resources: [
      "songs",
      "artists",
      "setlists",
      "gigs",
      "tags",
      "bands_owned",
      "band_memberships",
    ],
  },
  {
    key: "container",
    resources: [
      "band_members",
      "band_songs",
      "band_setlists",
      "band_gigs",
      "setlist_items",
    ],
  },
];

export function DefaultLimitsForm({
  initial,
  canEdit,
}: {
  initial: QuotaLimits;
  canEdit: boolean;
}) {
  const t = useTranslations("staff.limits");
  const tQuota = useTranslations("quotas");
  const tCommon = useTranslations("common");
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<Record<QuotaResource, string>>(
    () =>
      Object.fromEntries(
        QUOTA_RESOURCES.map((r) => [r, String(initial[r])]),
      ) as Record<QuotaResource, string>,
  );
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const parsed = Object.fromEntries(
    QUOTA_RESOURCES.map((r) => [r, Number(draft[r])]),
  ) as QuotaLimits;
  const invalid = QUOTA_RESOURCES.filter(
    (r) =>
      draft[r].trim() === "" ||
      !Number.isInteger(parsed[r]) ||
      parsed[r] < 0 ||
      parsed[r] > MAX_LIMIT,
  );
  const changed = QUOTA_RESOURCES.filter((r) => parsed[r] !== saved[r]);
  const lowered = changed.filter((r) => parsed[r] < saved[r]);

  const save = () => {
    startTransition(async () => {
      const result = await updateQuotaDefaults(parsed);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      setSaved(parsed);
      setConfirming(false);
      toast.success(t("saved"));
    });
  };

  return (
    <div className="space-y-6">
      {GROUPS.map((group) => (
        <fieldset
          key={group.key}
          className="space-y-3"
          disabled={!canEdit || isPending}
        >
          <legend className="text-sm font-semibold">
            {t(`groups.${group.key}`)}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.resources.map((resource) => (
              <div key={resource} className="space-y-1">
                <label
                  htmlFor={`default-${resource}`}
                  className="text-muted-foreground text-xs font-medium"
                >
                  {tQuota(`resources.${resource}`)}
                </label>
                <Input
                  id={`default-${resource}`}
                  inputMode="numeric"
                  value={draft[resource]}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      [resource]: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                  aria-invalid={invalid.includes(resource)}
                />
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      {invalid.length > 0 && (
        <p className="text-destructive text-sm">
          {t("invalid", { max: MAX_LIMIT })}
        </p>
      )}

      {canEdit && (
        <div className="flex justify-end">
          <Button
            onClick={() => (lowered.length > 0 ? setConfirming(true) : save())}
            disabled={changed.length === 0 || invalid.length > 0 || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tCommon("save")}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("lowerTitle")}
        description={t("lowerDescription", {
          resources: lowered.map((r) => tQuota(`resources.${r}`)).join(", "),
        })}
        confirmLabel={t("lowerConfirm")}
        pending={isPending}
        onConfirm={save}
      />
    </div>
  );
}
