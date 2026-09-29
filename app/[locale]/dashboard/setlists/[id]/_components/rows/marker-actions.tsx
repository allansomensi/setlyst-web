"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Edit/delete buttons shared by block and break rows. Offline these are
 * disabled like every other write in the manager.
 *
 * Named after their row ("Edit “Encore”"): a screen reader's list of
 * buttons otherwise read "Edit, Delete, Edit, Delete…" with no way to
 * tell which block or break each one acts on.
 */
export function MarkerActions({
  name,
  onEdit,
  onDelete,
  disabled,
}: {
  /** The block's name or the break's label, as shown in the row. */
  name: string;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const t = useTranslations("setlists.songs");
  const tCommon = useTranslations("common");
  return (
    <div className="flex justify-end gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        onClick={onEdit}
        disabled={disabled}
        aria-label={t("editMarker", { name })}
        title={tCommon("edit")}
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        disabled={disabled}
        aria-label={t("deleteMarker", { name })}
        title={tCommon("delete")}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
