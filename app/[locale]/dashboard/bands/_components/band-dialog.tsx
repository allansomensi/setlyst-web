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
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";

interface BandDialogProps {
  band?: BandWithMembership | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Creates a band or edits its name and description. A GuardedDialog like
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
  const isEditing = !!band;

  const isDirty =
    name !== (band?.name ?? "") || description !== (band?.description ?? "");
  const requestClose = useGuardedForm({ isDirty, isPending }, onClose);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    // onSubmit rather than a form `action`: React 19 resets a form after
    // its action runs, which would wipe the fields when saving fails.
    event.preventDefault();
    // A double Enter must not create the band twice.
    if (isPending) return;
    const data = { name, description };

    startTransition(async () => {
      const result = isEditing
        ? await updateBand(band.id, data)
        : await createBand(data);

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
          {tCommon("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
