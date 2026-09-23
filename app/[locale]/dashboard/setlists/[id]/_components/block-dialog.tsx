"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { createSetlistBlock, updateSetlistBlock } from "../../actions";

/** What the dialog edits: a new block, or an existing one by id. */
export interface BlockDraft {
  id?: string;
  name: string;
}

/**
 * Creates or renames a block (a heading that groups songs, like "Set 1").
 * Mount it with `key` per draft so it starts from the draft's values.
 */
export function BlockDialog({
  setlistId,
  draft,
  onClose,
  onSaved,
}: {
  setlistId: string;
  /** Null keeps the dialog closed. */
  draft: BlockDraft | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("setlists.songs");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(draft?.name ?? "");
  const [isPending, startTransition] = useTransition();
  const trimmed = name.trim();

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!draft || !trimmed) return;
    startTransition(async () => {
      const result = draft.id
        ? await updateSetlistBlock(setlistId, draft.id, trimmed)
        : await createSetlistBlock(setlistId, trimmed);

      if (result.success) {
        toast.success(draft.id ? t("blockUpdated") : t("blockAdded"));
        onSaved();
      } else {
        toastActionError(result, result.error);
      }
    });
  };

  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={save} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? t("editBlockTitle") : t("addBlockTitle")}
            </DialogTitle>
            <DialogDescription>{t("blockDialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="block-name">{t("blockNameLabel")}</Label>
            <Input
              id="block-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("blockNamePlaceholder")}
              maxLength={255}
              disabled={isPending}
              autoFocus
            />
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
            <Button type="submit" disabled={isPending || !trimmed}>
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
