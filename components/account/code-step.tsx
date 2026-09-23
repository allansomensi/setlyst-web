"use client";

import { useTranslations } from "next-intl";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/auth/otp-input";
import { formatCountdown } from "@/lib/auth-flow";

interface CodeStepProps {
  id: string;
  code: string;
  onCodeChange: (value: string) => void;
  onComplete: (value: string) => void;
  onResend: () => void;
  /** Seconds left before another code may be requested. */
  cooldown: number;
  pending: boolean;
  error: string | null;
}

/**
 * The "type the 6-digit code we e-mailed you" block shared by the e-mail
 * verification and e-mail change dialogs: the code field (submits by
 * itself once complete), the error, and "resend" with its countdown.
 */
export function CodeStep({
  id,
  code,
  onCodeChange,
  onComplete,
  onResend,
  cooldown,
  pending,
  error,
}: CodeStepProps) {
  const t = useTranslations("emailVerification");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t("codeLabel")}</Label>
      <OtpInput
        id={id}
        autoFocus
        value={code}
        onChange={onCodeChange}
        onComplete={onComplete}
        disabled={pending}
        invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-destructive text-sm font-medium"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{t("codeHint")}</span>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          disabled={pending || cooldown > 0}
          onClick={onResend}
        >
          <RotateCw className="size-3" />
          {cooldown > 0
            ? t("resendIn", { time: formatCountdown(cooldown) })
            : t("resend")}
        </Button>
      </div>
    </div>
  );
}
