"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DiscardChangesDialog } from "@/components/ui/discard-changes-dialog";
import { useDialogCloseGuard } from "@/hooks/use-dialog-close-guard";

interface FormState {
  isDirty: boolean;
  isPending: boolean;
}

const IDLE: FormState = { isDirty: false, isPending: false };

interface GuardContextValue {
  requestClose: () => void;
  report: (state: FormState) => void;
}

const GuardContext = createContext<GuardContextValue | null>(null);

/**
 * A Dialog for a form that must not lose what was typed: Escape, a tap on
 * the backdrop, × and the form's own Cancel all go through
 * useDialogCloseGuard (ignored while saving, "Descartar alterações?" when
 * dirty). The form inside tells it its state with `useGuardedForm`.
 *
 * The content is mounted only while open, so every opening starts fresh.
 */
export function GuardedDialog({
  open,
  onClose,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Classes for DialogContent (width, etc.). */
  className?: string;
  children: ReactNode;
}) {
  const [reported, setState] = useState<FormState>(IDLE);
  // A closed dialog has no form; a reopened one reports afresh on mount.
  const state = open ? reported : IDLE;
  const close = useCallback(() => {
    setState(IDLE);
    onClose();
  }, [onClose]);
  const guard = useDialogCloseGuard({
    isDirty: state.isDirty,
    isPending: state.isPending,
    onClose: close,
  });

  const report = useCallback((next: FormState) => {
    setState((prev) =>
      prev.isDirty === next.isDirty && prev.isPending === next.isPending
        ? prev
        : next,
    );
  }, []);

  const { requestClose } = guard;

  return (
    <GuardContext.Provider value={{ requestClose, report }}>
      <Dialog open={open} onOpenChange={guard.onOpenChange}>
        <DialogContent className={className}>{open && children}</DialogContent>
      </Dialog>
      <DiscardChangesDialog {...guard.discard} />
    </GuardContext.Provider>
  );
}

/**
 * Reports a form's dirty/pending state to the enclosing GuardedDialog and
 * returns the guarded close, for the Cancel button. Outside a GuardedDialog
 * it is inert and returns `fallbackClose`.
 */
export function useGuardedForm(
  state: FormState,
  fallbackClose?: () => void,
): () => void {
  const ctx = useContext(GuardContext);
  const report = ctx?.report;
  const { isDirty, isPending } = state;
  useEffect(() => {
    report?.({ isDirty, isPending });
  }, [report, isDirty, isPending]);
  return ctx?.requestClose ?? fallbackClose ?? noop;
}

function noop() {}
