"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { changeOwnPassword } from "@/lib/actions/password";
import { isPasswordCompliant } from "@/lib/password-policy";
import { toastActionError } from "@/lib/action-toast";
import { toast } from "sonner";

interface ChangePasswordFormProps {
  username: string;
  /** Rendered next to the submit button (e.g. a Cancel button). */
  secondaryAction?: React.ReactNode;
}

/**
 * The one password-change form, used both on the mandatory change screen
 * and in the account's security settings. Changing the password signs
 * the account out everywhere (the API revokes every token), so on success
 * it signs out and sends the person to sign in with the new password.
 */
export function ChangePasswordForm({
  username,
  secondaryAction,
}: ChangePasswordFormProps) {
  const t = useTranslations("changePassword");
  const tPassword = useTranslations("passwordPolicy");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const compliant = isPasswordCompliant(next, username);
  const mismatch = confirm.length > 0 && confirm !== next;
  const same = next.length > 0 && next === current;
  const canSubmit =
    current.length > 0 && compliant && confirm === next && !same;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);

    startTransition(async () => {
      const result = await changeOwnPassword({
        currentPassword: current,
        newPassword: next,
      });

      if (!result.success) {
        if (
          result.code === "session_revoked" ||
          result.code === "rate_limited"
        ) {
          toastActionError(result, result.error);
          return;
        }
        setError(result.error);
        return;
      }

      toast.success(t("success"));
      await signOut({
        callbackUrl: `/${locale}/login?reason=password_changed`,
      });
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <input
        type="text"
        name="username"
        autoComplete="username"
        value={username}
        readOnly
        hidden
      />
      <div className="space-y-2">
        <Label htmlFor="current_password">{t("current")}</Label>
        <PasswordInput
          id="current_password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          disabled={isPending}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new_password">{t("new")}</Label>
        <PasswordInput
          id="new_password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          disabled={isPending}
          maxLength={128}
          required
          aria-invalid={next.length > 0 && (!compliant || same)}
        />
        <PasswordRequirements password={next} username={username} />
        {same && <p className="text-destructive text-xs">{t("same")}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm_password">{t("confirm")}</Label>
        <PasswordInput
          id="confirm_password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={isPending}
          maxLength={128}
          required
          aria-invalid={mismatch}
        />
        {mismatch && (
          <p className="text-destructive text-xs">{tPassword("mismatch")}</p>
        )}
      </div>

      <p className="text-muted-foreground text-xs">{t("signOutNotice")}</p>

      {error && (
        <p role="alert" className="text-destructive text-sm font-medium">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {secondaryAction}
        <Button type="submit" disabled={isPending || !canSubmit}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isPending ? t("saving") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
