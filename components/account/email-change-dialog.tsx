"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2, Mail } from "lucide-react";
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
import { PasswordInput } from "@/components/auth/password-input";
import { useAppRouter } from "@/hooks/use-app-router";
import { useCountdown } from "@/hooks/use-countdown";
import { confirmEmailChange, startEmailChange } from "@/lib/actions/account";
import { toastActionError } from "@/lib/action-toast";
import { toast } from "@/lib/toast";
import { CodeStep } from "./code-step";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` when the account has no address yet (the dialog "adds" one). */
  currentEmail: string | null;
  /** The current password is asked for when the account has one. */
  passwordSet: boolean;
  /** For the hidden username field password managers look for. */
  username: string;
}

/**
 * Changes (or adds) the account's e-mail address. The new address must
 * prove it's reachable: a 6-digit code is sent there, and the change only
 * applies once it's typed. The previous address is told about it.
 */
export function EmailChangeDialog({
  open,
  onOpenChange,
  currentEmail,
  passwordSet,
  username,
}: EmailChangeDialogProps) {
  const t = useTranslations("account.emailChange");
  const router = useAppRouter();
  const { update } = useSession();
  const [step, setStep] = useState<"form" | "code">("form");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, startCooldown] = useCountdown();

  const email = newEmail.trim();
  const emailValid = EMAIL_PATTERN.test(email);
  const same =
    currentEmail !== null && email.toLowerCase() === currentEmail.toLowerCase();
  const canStart =
    emailValid && !same && (!passwordSet || password.length > 0) && !pending;

  const reset = () => {
    setStep("form");
    setNewEmail("");
    setPassword("");
    setCode("");
    setError(null);
  };

  const start = async (isResend: boolean) => {
    if (!isResend && !canStart) return;
    setPending(true);
    setError(null);
    const result = await startEmailChange({
      newEmail: email,
      password: passwordSet ? password : undefined,
    });
    setPending(false);
    if (!result.success) {
      if (result.retryAfterSeconds) startCooldown(result.retryAfterSeconds);
      if (result.code) {
        toastActionError(result, result.error);
        return;
      }
      setError(result.error);
      if (isResend) toast.error(result.error);
      return;
    }
    startCooldown(result.data?.resend_after_seconds ?? 60);
    setStep("code");
    if (isResend) toast.success(t("resent", { email }));
  };

  const confirm = async (value: string) => {
    if (value.length !== 6 || pending) return;
    setPending(true);
    setError(null);
    const result = await confirmEmailChange(value);
    setPending(false);
    if (!result.success) {
      if (result.code) {
        toastActionError(result, result.error);
        return;
      }
      setError(result.error);
      setCode("");
      return;
    }
    await update({ refreshAccount: true }).catch(() => null);
    toast.success(t("success", { email }));
    onOpenChange(false);
    reset();
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="text-primary size-5" />
            {currentEmail ? t("title") : t("addTitle")}
          </DialogTitle>
          <DialogDescription>
            {step === "form" ? t("description") : t("codeSent", { email })}
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void start(false);
            }}
            className="space-y-4"
            noValidate
          >
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              readOnly
              hidden
            />
            {currentEmail && (
              <p className="text-muted-foreground text-sm">
                {t("current")}{" "}
                <span className="text-foreground font-medium break-all">
                  {currentEmail}
                </span>
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-email">{t("newEmail")}</Label>
              <Input
                id="new-email"
                type="email"
                autoComplete="email"
                autoFocus
                maxLength={254}
                placeholder={t("newEmailPlaceholder")}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={pending}
                aria-invalid={
                  (email.length > 0 && !emailValid) || same || undefined
                }
                className="h-10"
              />
              {same && <p className="text-destructive text-xs">{t("same")}</p>}
            </div>
            {passwordSet && (
              <div className="space-y-2">
                <Label htmlFor="email-change-password">{t("password")}</Label>
                <PasswordInput
                  id="email-change-password"
                  autoComplete="current-password"
                  maxLength={256}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={pending}
                  className="h-10"
                />
                <p className="text-muted-foreground text-xs">
                  {t("passwordHint")}
                </p>
              </div>
            )}
            {error && (
              <p role="alert" className="text-destructive text-sm font-medium">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  onOpenChange(false);
                  reset();
                }}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={!canStart}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("sendCode")}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void confirm(code);
            }}
            className="space-y-4"
            noValidate
          >
            <CodeStep
              id="email-change-code"
              code={code}
              onCodeChange={setCode}
              onComplete={(value) => void confirm(value)}
              onResend={() => void start(true)}
              cooldown={cooldown}
              pending={pending}
              error={error}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setStep("form");
                  setCode("");
                  setError(null);
                }}
              >
                {t("back")}
              </Button>
              <Button type="submit" disabled={pending || code.length !== 6}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("confirm")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
