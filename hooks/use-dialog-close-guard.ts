"use client";

import { useCallback, useState } from "react";

interface DialogCloseGuardOptions {
  /** Whether the form holds anything that closing would throw away. */
  isDirty: boolean;
  /** While saving, the dialog can't be closed at all. */
  isPending: boolean;
  /** Actually closes the dialog. */
  onClose: () => void;
}

/**
 * Keeps a form dialog from being closed by accident: Escape, a tap on the
 * backdrop or the × button used to throw away everything typed across
 * several tabs.
 *
 * - While saving, closing is ignored (the request is already on its way).
 * - With unsaved input, closing asks first ("Descartar alterações?").
 * - Otherwise it closes right away.
 *
 * Wire `onOpenChange` to the Dialog, `requestClose` to the Cancel button,
 * and spread `discard` onto a <DiscardChangesDialog />.
 */
export function useDialogCloseGuard({
  isDirty,
  isPending,
  onClose,
}: DialogCloseGuardOptions) {
  const [confirming, setConfirming] = useState(false);

  const requestClose = useCallback(() => {
    if (isPending) return;
    if (isDirty) {
      setConfirming(true);
      return;
    }
    onClose();
  }, [isDirty, isPending, onClose]);

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) requestClose();
    },
    [requestClose],
  );

  const discard = {
    open: confirming,
    onKeepEditing: () => setConfirming(false),
    onDiscard: () => {
      setConfirming(false);
      onClose();
    },
  };

  return { onOpenChange, requestClose, discard };
}
