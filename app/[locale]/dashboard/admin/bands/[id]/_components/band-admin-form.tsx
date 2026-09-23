"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toastActionError } from "@/lib/action-toast";
import type { AdminBandSummary, UpdateBandPayload } from "@/types/api";
import { updateBandAsAdmin } from "../../../actions";

const NAME_MAX = 50;
const DESCRIPTION_MAX = 1000;

export function BandAdminForm({
  band,
  canEdit,
}: {
  band: AdminBandSummary;
  canEdit: boolean;
}) {
  const t = useTranslations("staff.bandDetail");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(band.name);
  const [description, setDescription] = useState(band.description ?? "");
  const [logoUrl, setLogoUrl] = useState(band.logo_url ?? "");
  const [isPending, startTransition] = useTransition();

  const trimmedName = name.trim();
  const logoValid = !logoUrl.trim() || /^https:\/\/\S+$/i.test(logoUrl.trim());
  const dirty =
    trimmedName !== band.name ||
    description.trim() !== (band.description ?? "") ||
    logoUrl.trim() !== (band.logo_url ?? "");

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const payload: UpdateBandPayload = {};
    if (trimmedName !== band.name) payload.name = trimmedName;
    if (description.trim() !== (band.description ?? "")) {
      payload.description = description.trim() || null;
    }
    if (logoUrl.trim() !== (band.logo_url ?? "")) {
      payload.logo_url = logoUrl.trim() || null;
    }
    startTransition(async () => {
      const result = await updateBandAsAdmin(band.id, payload);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("saved"));
    });
  };

  const toggleSetlists = (value: boolean) => {
    startTransition(async () => {
      const result = await updateBandAsAdmin(band.id, {
        members_can_manage_setlists: value,
      });
      if (!result.success) toastActionError(result, result.error);
      else toast.success(t("saved"));
    });
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <fieldset disabled={!canEdit || isPending} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="band-name">{t("name")}</Label>
          <Input
            id="band-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="band-description">{t("description")}</Label>
          <Textarea
            id="band-description"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value.slice(0, DESCRIPTION_MAX))
            }
            rows={4}
          />
          <p className="text-muted-foreground text-right text-xs">
            {description.length}/{DESCRIPTION_MAX}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="band-logo">{t("logo")}</Label>
          <Input
            id="band-logo"
            type="url"
            inputMode="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://"
            aria-invalid={!logoValid}
          />
          {!logoValid && (
            <p className="text-destructive text-xs">{t("logoInvalid")}</p>
          )}
        </div>
        <label className="flex items-start justify-between gap-3 rounded-lg border p-3">
          <span className="space-y-0.5">
            <span className="block text-sm font-medium">
              {t("membersManageSetlists")}
            </span>
            <span className="text-muted-foreground block text-xs">
              {t("membersManageSetlistsHint")}
            </span>
          </span>
          <Switch
            checked={band.members_can_manage_setlists}
            onCheckedChange={toggleSetlists}
            disabled={!canEdit || isPending}
          />
        </label>
      </fieldset>
      {canEdit && (
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!dirty || !trimmedName || !logoValid || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tCommon("save")}
          </Button>
        </div>
      )}
    </form>
  );
}
