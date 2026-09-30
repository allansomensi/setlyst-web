"use client";

import { useState, useTransition, type FormEvent } from "react";
import { BandWithMembership } from "@/types/api";
import { createBand, updateBand } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GuardedDialog, useGuardedForm } from "@/components/ui/guarded-dialog";
import { Info, Loader2 } from "lucide-react";
import { AVATAR_URL_MAX, isAcceptableAvatarUrl } from "@/lib/profile";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";

interface BandDialogProps {
  band?: BandWithMembership | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Creates a band or edits its name, description and logo (the logo only
 * when editing: the dialog is offered to the band's owner and admins,
 * the roles the API lets change it). A GuardedDialog like
 * the other forms: Escape or a stray tap outside asks before throwing
 * what was typed away, and nothing closes it while saving.
 */
export function BandDialog(props: BandDialogProps) {
  return (
    <GuardedDialog open={props.isOpen} onClose={props.onClose}>
      <BandForm key={props.band?.id ?? "new"} {...props} />
    </GuardedDialog>
  );
}

function BandForm({ band, onClose }: BandDialogProps) {
  const t = useTranslations("bands.dialog");
  const tCommon = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  // Controlled, so the guard can tell whether closing loses anything.
  const [name, setName] = useState(band?.name ?? "");
  const [description, setDescription] = useState(band?.description ?? "");
  const [logoUrl, setLogoUrl] = useState(band?.logo_url ?? "");
  const isEditing = !!band;
  const logo = logoUrl.trim();
  const logoValid = !logo || isAcceptableAvatarUrl(logo);

  const isDirty =
    name !== (band?.name ?? "") ||
    description !== (band?.description ?? "") ||
    logoUrl !== (band?.logo_url ?? "");
  const requestClose = useGuardedForm({ isDirty, isPending }, onClose);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    // onSubmit rather than a form `action`: React 19 resets a form after
    // its action runs, which would wipe the fields when saving fails.
    event.preventDefault();
    // A double Enter must not create the band twice.
    if (isPending || !logoValid) return;

    startTransition(async () => {
      const result = isEditing
        ? await updateBand(band.id, {
            name,
            description,
            // Only when it changed: a new logo needs a verified e-mail and
            // is re-checked by moderation, a rename shouldn't trigger that.
            ...(logo !== (band.logo_url ?? "") && { logo_url: logo || null }),
          })
        : await createBand({ name, description });

      if (result.success) {
        toast.success(isEditing ? t("updated") : t("created"));
        onClose();
      } else {
        toastActionError(result, result.error || t("saveFailed"));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEditing ? t("editTitle") : t("addTitle")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {/* Prefixed ids: bare `name`/`description` could collide with
            another form's fields on the same page and point the labels at
            them. */}
        <div className="space-y-2">
          <Label htmlFor="band-name">{t("nameLabel")}</Label>
          <Input
            id="band-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isPending}
            maxLength={60}
            placeholder={t("namePlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="band-description">{t("descriptionLabel")}</Label>
          <Input
            id="band-description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isPending}
            placeholder={t("descriptionPlaceholder")}
          />
        </div>
        {isEditing && (
          <div className="space-y-2">
            <Label htmlFor="band-logo">{t("logoLabel")}</Label>
            <Input
              id="band-logo"
              name="logo_url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              maxLength={AVATAR_URL_MAX}
              placeholder="https://"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              disabled={isPending}
              aria-invalid={!logoValid || undefined}
              aria-describedby="band-logo-help"
            />
            {!logoValid && (
              <p role="alert" className="text-destructive text-xs font-medium">
                {t("logoInvalid")}
              </p>
            )}
            <p
              id="band-logo-help"
              className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed"
            >
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {t("logoHelp")}
            </p>
          </div>
        )}
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
        <Button type="submit" disabled={isPending || !logoValid}>
          {isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          )}
          {tCommon("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
