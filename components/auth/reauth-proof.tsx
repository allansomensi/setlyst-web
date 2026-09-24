"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Mail, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/auth/otp-input";
import { PasswordInput } from "@/components/auth/password-input";
import { useCountdown } from "@/hooks/use-countdown";
import { requestReauthCode } from "@/lib/actions/security";
import { toastActionError } from "@/lib/action-toast";
import {
  formatCountdown,
  reauthMethodOf,
  type ReauthMethod,
  type ReauthProof,
} from "@/lib/auth-flow";

/** Seconds before another code may be asked for (the API allows 1/min). */
const RESEND_SECONDS = 60;

/** A failed action result, as far as re-authentication cares. */
interface FailureLike {
  success: false;
  apiCode?: string;
  meta?: Record<string, unknown>;
}

export interface ReauthProofState {
  /** How the person proves it's them: password, or a code e-mailed now. */
  method: ReauthMethod;
  password: string;
  setPassword: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  /** A code was e-mailed in this dialog. */
  codeSent: boolean;
  setCodeSent: (sent: boolean) => void;
  /** The fields for the action (`password` or `reauthCode`). */
  proof: ReauthProof;
  /** Enough has been typed to submit. */
  complete: boolean;
  /** Back to the initial state (dialog closed). */
  reset: () => void;
  /**
   * Reacts to a failed action: on `REAUTH_REQUIRED` it switches to the
   * method the API asked for; on a wrong e-mailed code it clears the code.
   * Returns true when the failure was about re-authentication (the caller
   * then shows `result.error` next to the field).
   */
  handleFailure: (result: FailureLike) => boolean;
}

/**
 * State for proving it's really the account holder before a sensitive
 * change (e-mail, two-factor, linked sign-ins, account deletion). Accounts
 * with a password type it; accounts without one (Google-only) get a
 * 6-digit code by e-mail instead (`POST /users/me/reauth/code`).
 */
export function useReauthProof(passwordSet: boolean): ReauthProofState {
  const initial: ReauthMethod = passwordSet ? "password" : "email_code";
  const [method, setMethod] = useState<ReauthMethod>(initial);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const reset = useCallback(() => {
    setMethod(initial);
    setPassword("");
    setCode("");
    setCodeSent(false);
  }, [initial]);

  const handleFailure = useCallback(
    (result: FailureLike) => {
      if (result.apiCode === "REAUTH_REQUIRED") {
        setMethod(reauthMethodOf(result.meta) ?? initial);
        setPassword("");
        setCode("");
        return true;
      }
      if (result.apiCode === "WRONG_PASSWORD") {
        setPassword("");
        return true;
      }
      if (
        method === "email_code" &&
        (result.apiCode === "INVALID_CODE" || result.apiCode === "CODE_EXPIRED")
      ) {
        setCode("");
        if (result.apiCode === "CODE_EXPIRED") setCodeSent(false);
        return true;
      }
      return false;
    },
    [initial, method],
  );

  return {
    method,
    password,
    setPassword,
    code,
    setCode,
    codeSent,
    setCodeSent,
    proof: method === "password" ? { password } : { reauthCode: code },
    complete: method === "password" ? password.length > 0 : code.length === 6,
    reset,
    handleFailure,
  };
}

interface ReauthProofFieldProps {
  state: ReauthProofState;
  /** Prefix for the fields' ids (unique per dialog). */
  id: string;
  /** Label of the password field (each dialog words it its own way). */
  passwordLabel: string;
  /** Short hint under the password field, if any. */
  passwordHint?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * The proof-of-identity field of a sensitive dialog: the password, or
 * "Enviar código para meu e-mail" followed by the 6-digit code.
 */
export function ReauthProofField({
  state,
  id,
  passwordLabel,
  passwordHint,
  disabled,
  autoFocus,
}: ReauthProofFieldProps) {
  const t = useTranslations("security.reauth");
  const [cooldown, startCooldown] = useCountdown();
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  if (state.method === "password") {
    return (
      <div className="space-y-2">
        <Label htmlFor={`${id}-password`}>{passwordLabel}</Label>
        <PasswordInput
          id={`${id}-password`}
          autoComplete="current-password"
          autoFocus={autoFocus}
          maxLength={256}
          value={state.password}
          onChange={(event) => state.setPassword(event.target.value)}
          disabled={disabled}
          className="h-10"
        />
        {passwordHint && (
          <p className="text-muted-foreground text-xs">{passwordHint}</p>
        )}
      </div>
    );
  }

  const send = async () => {
    if (sending || cooldown > 0) return;
    setSending(true);
    setSendError(null);
    const result = await requestReauthCode().catch(() => null);
    setSending(false);
    if (!result) {
      setSendError(t("sendFailed"));
      return;
    }
    if (!result.success) {
      if (result.retryAfterSeconds) startCooldown(result.retryAfterSeconds);
      setSendError(result.error);
      // No verified address to send the code to: the toast offers to
      // verify it (lib/action-toast.tsx).
      if (result.apiCode === "EMAIL_NOT_VERIFIED") {
        toastActionError(result, result.error);
      }
      return;
    }
    state.setCodeSent(true);
    state.setCode("");
    startCooldown(RESEND_SECONDS);
  };

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-sm">
        {state.codeSent ? t("codeSent") : t("explanation")}
      </p>
      {state.codeSent ? (
        <>
          <Label htmlFor={`${id}-code`}>{t("codeLabel")}</Label>
          <OtpInput
            id={`${id}-code`}
            autoFocus
            value={state.code}
            onChange={state.setCode}
            disabled={disabled}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              disabled={disabled || sending || cooldown > 0}
              onClick={() => void send()}
            >
              {sending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RotateCw className="size-3" />
              )}
              {cooldown > 0
                ? t("resendIn", { time: formatCountdown(cooldown) })
                : t("resend")}
            </Button>
          </div>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={disabled || sending || cooldown > 0}
          onClick={() => void send()}
        >
          {sending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Mail className="mr-2 size-4" />
          )}
          {cooldown > 0
            ? t("resendIn", { time: formatCountdown(cooldown) })
            : t("send")}
        </Button>
      )}
      {sendError && (
        <p role="alert" className="text-destructive text-sm font-medium">
          {sendError}
        </p>
      )}
    </div>
  );
}
