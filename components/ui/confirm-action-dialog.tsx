"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel?: ReactNode;
  /** Runs the action. The dialog stays open (with a spinner) until it settles. */
  onConfirm: () => void;
  pending?: boolean;
  destructive?: boolean;
  /** Keeps the confirm button off until the form inside is valid. */
  confirmDisabled?: boolean;
  children?: ReactNode;
}

/**
 * Confirmation for a destructive or irreversible action, as an
 * `alertdialog`: no dismissing by a stray tap outside, focus starts on
 * Cancel, and while the action runs the dialog can't be closed and the
 * confirm button shows a spinner. The caller closes it once the action has
 * succeeded (Radix then returns focus to whatever opened it).
 */
export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  pending = false,
  destructive = true,
  confirmDisabled = false,
  children,
}: ConfirmActionDialogProps) {
  const tCommon = useTranslations("common");
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {cancelLabel ?? tCommon("cancel")}
          </AlertDialogCancel>
          {/* A plain button, not AlertDialogAction: that one closes the
              dialog on click, before the action has had a chance to fail. */}
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={pending || confirmDisabled}
            aria-busy={pending || undefined}
          >
            {pending && (
              <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />
            )}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
