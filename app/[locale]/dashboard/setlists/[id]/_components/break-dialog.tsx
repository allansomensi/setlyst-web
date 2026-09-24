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
import { createSetlistBreak, updateSetlistBreak } from "../../actions";

/** What the dialog edits: a new break, or an existing one by id. */
export interface BreakDraft {
  id?: string;
  label: string;
  /** As typed; empty = no duration. */
  durationMinutes: string;
}

/**
 * Creates or edits a break (an interval between songs, with an optional
 * label and duration). Mount it with `key` per draft.
 */
export function BreakDialog({
  setlistId,
  draft,
  onClose,
  onSaved,
}: {
  setlistId: string;
  /** Null keeps the dialog closed. */
  draft: BreakDraft | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("setlists.songs");
  const tCommon = useTranslations("common");
  const [label, setLabel] = useState(draft?.label ?? "");
  const [duration, setDuration] = useState(draft?.durationMinutes ?? "");
  const [isPending, startTransition] = useTransition();

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (isPending || !draft) return;
    const payload = {
      label: label.trim(),
      duration_minutes: duration ? Number(duration) : null,
    };
    startTransition(async () => {
      const result = draft.id
        ? await updateSetlistBreak(setlistId, draft.id, payload)
        : await createSetlistBreak(setlistId, payload);

      if (result.success) {
        toast.success(draft.id ? t("breakUpdated") : t("breakAdded"));
        onSaved();
      } else {
        toastActionError(result, result.error);
      }
    });
  };

  return (
    <Dialog
      open={draft !== null}
      onOpenChange={(open) => !open && !isPending && onClose()}
    >
      <DialogContent>
        <form onSubmit={save} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? t("editBreakTitle") : t("addBreakTitle")}
            </DialogTitle>
            <DialogDescription>{t("breakDialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="break-label">{t("breakLabelLabel")}</Label>
              <Input
                id="break-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t("breakDefaultLabel")}
                maxLength={255}
                disabled={isPending}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="break-duration">{t("breakDurationLabel")}</Label>
              <Input
                id="break-duration"
                type="number"
                inputMode="numeric"
                min={0}
                max={1440}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="15"
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
