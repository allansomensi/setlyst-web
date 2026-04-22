"use client";

import { useTransition } from "react";
import { Setlist } from "@/types/api";
import { createSetlist, updateSetlist } from "../actions";
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

interface SetlistDialogProps {
  setlist?: Setlist | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SetlistDialog({
  setlist,
  isOpen,
  onClose,
}: SetlistDialogProps) {
  const t = useTranslations("setlists.dialog");
  const tCommon = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const isEditing = !!setlist;

  const handleAction = (formData: FormData) => {
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateSetlist(setlist.id, data)
        : await createSetlist(data);

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
        <form action={handleAction} key={setlist?.id || "new"}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t("editTitle") : t("addTitle")}
            </DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t("titleLabel")}</Label>
              <Input
                id="title"
                name="title"
                defaultValue={setlist?.title}
                required
                disabled={isPending}
                maxLength={255}
                placeholder={t("titlePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("descriptionLabel")}</Label>
              <Input
                id="description"
                name="description"
                defaultValue={setlist?.description || ""}
                disabled={isPending}
                placeholder={t("descriptionPlaceholder")}
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
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
