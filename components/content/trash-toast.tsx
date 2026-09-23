"use client";

import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { restoreTrashItem } from "@/lib/actions/trash";
import type { TrashType } from "@/types/content";

interface TrashToastText {
  /** "Música movida para a lixeira." */
  message: string;
  /** "Desfazer" */
  undoLabel: string;
  /** "Música restaurada." */
  restored: string;
  /** Shown when the restore fails without a specific reason. */
  restoreFailed: string;
}

/**
 * The toast after a delete: the item is in the trash, and "Desfazer"
 * brings it back right away. Restore conflicts (`RESTORE_CONFLICT`) and
 * the rest come back translated from the action.
 */
export function toastMovedToTrash(
  type: TrashType,
  id: string,
  text: TrashToastText,
  onRestored?: () => void,
) {
  toast.success(text.message, {
    duration: 8000,
    action: {
      label: text.undoLabel,
      onClick: async () => {
        const result = await restoreTrashItem(type, id);
        if (result.success) {
          toast.success(text.restored);
          onRestored?.();
        } else {
          toastActionError(result, result.error || text.restoreFailed);
        }
      },
    },
  });
}
