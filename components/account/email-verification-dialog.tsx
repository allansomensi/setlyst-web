"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2, MailCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppRouter } from "@/hooks/use-app-router";
import { useCountdown } from "@/hooks/use-countdown";
import { sendEmailVerification, verifyEmail } from "@/lib/actions/account";
import { toastActionError } from "@/lib/action-toast";
import { toast } from "@/lib/toast";
import { CodeStep } from "./code-step";

interface EmailVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onVerified?: () => void;
}

/**
 * Confirms the account's e-mail address: send a 6-digit code, type it.
 * A code may already be on its way (one is sent at sign-up), so the code
 * field is one click away without sending another.
 */
export function EmailVerificationDialog({
  open,
  onOpenChange,
  email,
  onVerified,
}: EmailVerificationDialogProps) {
  const t = useTranslations("emailVerification");
  const router = useAppRouter();
  const { update } = useSession();
  const [step, setStep] = useState<"intro" | "code">("intro");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, startCooldown] = useCountdown();

  const reset = () => {
    setStep("intro");
    setCode("");
    setError(null);
  };

  const send = async () => {
    setPending(true);
    setError(null);
    const result = await sendEmailVerification();
    setPending(false);
    if (!result.success) {
      if (result.apiCode === "EMAIL_ALREADY_VERIFIED") {
        await finish();
        return;
      }
      if (result.retryAfterSeconds) startCooldown(result.retryAfterSeconds);
      toastActionError(result, result.error);
      return;
    }
    startCooldown(result.data?.resend_after_seconds ?? 60);
    setStep("code");
    toast.success(t("sent", { email }));
  };

  const finish = async () => {
    await update({ refreshAccount: true }).catch(() => null);
    toast.success(t("verified"));
    onOpenChange(false);
    reset();
    onVerified?.();
    router.refresh();
  };

  const verify = async (value: string) => {
    if (value.length !== 6 || pending) return;
    setPending(true);
    setError(null);
    const result = await verifyEmail(value);
    setPending(false);
    if (!result.success) {
      if (result.apiCode === "EMAIL_ALREADY_VERIFIED") {
        await finish();
        return;
      }
      if (result.code) {
        toastActionError(result, result.error);
        return;
      }
      setError(result.error);
      setCode("");
      return;
    }
    await finish();
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
            <MailCheck className="text-primary size-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {step === "intro"
              ? t("intro", { email })
              : t("codeSent", { email })}
          </DialogDescription>
        </DialogHeader>

        {step === "code" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void verify(code);
            }}
            className="space-y-4"
            noValidate
          >
            <CodeStep
              id="email-verification-code"
              code={code}
              onCodeChange={setCode}
              onComplete={(value) => void verify(value)}
              onResend={() => void send()}
              cooldown={cooldown}
              pending={pending}
              error={error}
            />
            <DialogFooter>
              <Button
                type="submit"
                disabled={pending || code.length !== 6}
                className="w-full sm:w-auto"
              >
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("confirm")}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setError(null);
                setStep("code");
              }}
            >
              {t("haveCode")}
            </Button>
            <Button
              type="button"
              onClick={() => void send()}
              disabled={pending || cooldown > 0}
            >
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {t("send")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
