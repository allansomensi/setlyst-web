"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Artist } from "@/types/api";
import { createArtist, updateArtist } from "../actions";
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

interface ArtistDialogProps {
  artist?: Artist | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Creates or renames an artist. A GuardedDialog like the other forms:
 * Escape or a stray tap outside asks before throwing a typed name away,
 * and nothing closes it while saving.
 */
export function ArtistDialog(props: ArtistDialogProps) {
  return (
    <GuardedDialog open={props.isOpen} onClose={props.onClose}>
      <ArtistForm key={props.artist?.id ?? "new"} {...props} />
    </GuardedDialog>
  );
}

function ArtistForm({ artist, onClose }: ArtistDialogProps) {
  const t = useTranslations("artists.dialog");
  const tCommon = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  // Controlled, so the guard can tell whether closing loses anything.
  const [name, setName] = useState(artist?.name ?? "");
  const isEditing = !!artist;

  const isDirty = name !== (artist?.name ?? "");
  const requestClose = useGuardedForm({ isDirty, isPending }, onClose);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    // onSubmit rather than a form `action`: React 19 resets a form after
    // its action runs, which would wipe the name when saving fails.
    event.preventDefault();
    if (isPending) return;

    startTransition(async () => {
      const result = isEditing
        ? await updateArtist(artist.id, { name })
        : await createArtist({ name });

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
        <DialogDescription>
          {isEditing ? t("editDescription") : t("addDescription")}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          {/* Prefixed ids: a bare `name` could collide with another form's
              field on the same page and point the label at it. */}
          <Label htmlFor="artist-name">{t("nameLabel")}</Label>
          <Input
            id="artist-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            required
            maxLength={255}
            disabled={isPending}
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
