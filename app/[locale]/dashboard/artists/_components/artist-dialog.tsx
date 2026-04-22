"use client";

import { useTransition } from "react";
import { Artist } from "@/types/api";
import { createArtist, updateArtist } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ArtistDialogProps {
  artist?: Artist | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ArtistDialog({ artist, isOpen, onClose }: ArtistDialogProps) {
  const t = useTranslations("artists.dialog");
  const tCommon = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const isEditing = !!artist;

  const handleAction = (formData: FormData) => {
    const name = formData.get("name") as string;

    startTransition(async () => {
      const result = isEditing
        ? await updateArtist(artist.id, { name })
        : await createArtist({ name });

      if (result.success) {
        toast.success(isEditing ? t("updated") : t("created"));
        onClose();
      } else {
        toast.error(result.error || t("saveFailed"));
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form action={handleAction} key={artist?.id || "new"}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t("editTitle") : t("addTitle")}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? t("editDescription") : t("addDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("nameLabel")}</Label>
              <Input
                id="name"
                name="name"
                defaultValue={artist?.name || ""}
                placeholder={t("namePlaceholder")}
                required
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
