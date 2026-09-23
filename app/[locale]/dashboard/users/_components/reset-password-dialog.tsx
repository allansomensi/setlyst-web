"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { toastActionError } from "@/lib/action-toast";
import {
  generateStrongPassword,
  isPasswordCompliant,
} from "@/lib/password-policy";
import type { User } from "@/types/api";
import { resetUserPassword } from "../actions";

interface ResetPasswordDialogProps {
  user: Pick<User, "id" | "username"> | null;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

/**
 * Issues a temporary password. Staff never learn a password the person
 * keeps: by default they must replace it at their next sign-in, and every
 * existing session is signed out.
 */
export function ResetPasswordDialog({
  user,
  onOpenChange,
  onDone,
}: ResetPasswordDialogProps) {
  const t = useTranslations("staff.resetPassword");
  const tPolicy = useTranslations("passwordPolicy");
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [requireChange, setRequireChange] = useState(true);
  const [copied, setCopied] = useState(false);

  const close = (open: boolean) => {
    if (!open) {
      setPassword("");
      setRequireChange(true);
      setCopied(false);
    }
    onOpenChange(open);
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(tPolicy("copied"));
    } catch {
      // Clipboard can be unavailable (http, permissions) — the field is
      // still visible and selectable.
    }
  };

  const generate = () => {
    const next = generateStrongPassword();
    setPassword(next);
    setCopied(false);
    void copy(next);
  };

  const compliant = isPasswordCompliant(password, user?.username);

  const confirm = () => {
    if (!user || !compliant) return;
    startTransition(async () => {
      const result = await resetUserPassword(user.id, password, requireChange);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("done", { username: user.username }));
      onDone?.();
      close(false);
    });
  };

  return (
    <ConfirmDialog
      open={Boolean(user)}
      onOpenChange={close}
      title={t("title", { username: user?.username ?? "" })}
      description={t("description")}
      confirmLabel={t("confirm")}
      onConfirm={confirm}
      pending={isPending}
      confirmDisabled={!compliant}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="reset-password">{t("newPassword")}</Label>
          <Button type="button" variant="ghost" size="sm" onClick={generate}>
            <Wand2 className="mr-1.5 h-3.5 w-3.5" />
            {tPolicy("generate")}
          </Button>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <PasswordInput
              id="reset-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setCopied(false);
              }}
              autoComplete="new-password"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!password}
            onClick={() => copy(password)}
            aria-label={t("copy")}
            title={t("copy")}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <PasswordRequirements password={password} username={user?.username} />
        <label className="flex items-start justify-between gap-3 rounded-lg border p-3">
          <span className="space-y-0.5">
            <span className="block text-sm font-medium">
              {t("requireChange")}
            </span>
            <span className="text-muted-foreground block text-xs">
              {t("requireChangeHint")}
            </span>
          </span>
          <Switch checked={requireChange} onCheckedChange={setRequireChange} />
        </label>
        <p className="text-muted-foreground text-xs">{t("shareSafely")}</p>
      </div>
    </ConfirmDialog>
  );
}
