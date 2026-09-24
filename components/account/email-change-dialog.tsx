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
import { OtpInput } from "@/components/auth/otp-input";
import {
  ReauthProofField,
  useReauthProof,
} from "@/components/auth/reauth-proof";
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
  /**
   * The current password is asked for when the account has one; otherwise
   * a code e-mailed to the current address.
   */
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
  const tReauth = useTranslations("security.reauth");
  const router = useAppRouter();
  const { data: session, update } = useSession();
  // With two-factor on, the change also takes a code from the app.
  const needsSecondFactor = session?.user?.twoFactorEnabled === true;
  const [step, setStep] = useState<"form" | "code">("form");
  const [newEmail, setNewEmail] = useState("");
  const reauth = useReauthProof(passwordSet);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, startCooldown] = useCountdown();

  const email = newEmail.trim();
  const emailValid = EMAIL_PATTERN.test(email);
  const same =
    currentEmail !== null && email.toLowerCase() === currentEmail.toLowerCase();
  const canStart =
    emailValid &&
    !same &&
    reauth.complete &&
    (!needsSecondFactor || twoFactorCode.length === 6) &&
    !pending;

  const reset = () => {
    setStep("form");
    setNewEmail("");
    reauth.reset();
    setTwoFactorCode("");
    setCode("");
    setError(null);
  };

  const start = async (isResend: boolean) => {
    if (!isResend && !canStart) return;
    setPending(true);
    setError(null);
    const result = await startEmailChange({
      newEmail: email,
      ...reauth.proof,
      code: needsSecondFactor ? twoFactorCode : undefined,
    });
    setPending(false);
    if (!result.success) {
      if (result.retryAfterSeconds) startCooldown(result.retryAfterSeconds);
      if (reauth.handleFailure(result)) {
        if (isResend) setStep("form");
        setError(result.error);
        return;
      }
      if (
        result.apiCode === "INVALID_TWO_FACTOR_CODE" ||
        result.apiCode === "INVALID_CODE"
      ) {
        setTwoFactorCode("");
      }
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
            <ReauthProofField
              state={reauth}
              id="email-change"
              passwordLabel={t("password")}
              passwordHint={t("passwordHint")}
              disabled={pending}
            />
            {needsSecondFactor && (
              <div className="space-y-2">
                <Label htmlFor="email-change-2fa">
                  {tReauth("twoFactorLabel")}
                </Label>
                <OtpInput
                  id="email-change-2fa"
                  value={twoFactorCode}
                  onChange={setTwoFactorCode}
                  disabled={pending}
                />
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
