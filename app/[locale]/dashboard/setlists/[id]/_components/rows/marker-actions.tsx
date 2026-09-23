"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Edit/delete buttons shared by block and break rows. Offline these are
 * disabled like every other write in the manager.
 */
export function MarkerActions({
  onEdit,
  onDelete,
  disabled,
}: {
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const tCommon = useTranslations("common");
  return (
    <div className="flex justify-end gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        onClick={onEdit}
        disabled={disabled}
        aria-label={tCommon("edit")}
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
        aria-label={tCommon("delete")}
        title={tCommon("delete")}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
