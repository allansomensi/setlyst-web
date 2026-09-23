"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  MailCheck,
  RotateCw,
} from "lucide-react";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { OtpInput } from "@/components/auth/otp-input";
import { useCountdown } from "@/hooks/use-countdown";
import { requestPasswordReset, resetPassword } from "@/lib/actions/public-auth";
import { isPasswordCompliant } from "@/lib/password-policy";
import { secureSignOut } from "@/lib/client-logout";
import { formatCountdown } from "@/lib/auth-flow";
import { SUPPORT_EMAIL } from "@/lib/links";

/** The API allows one code per minute per account. */
const RESEND_SECONDS = 60;

type Step = "identify" | "reset" | "done";

export function ForgotPasswordFlow() {
  const t = useTranslations("forgotPassword");
  const tPassword = useTranslations("passwordPolicy");
  const locale = useLocale();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("identify");
  const [identifier, setIdentifier] = useState(
    () => searchParams.get("identifier")?.slice(0, 254) ?? "",
  );
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [cooldown, startCooldown] = useCountdown();
  const passwordRef = useRef<HTMLInputElement>(null);

  // The password rules forbid the username: only known when that's what
  // was typed (not an e-mail address).
  const username = identifier.includes("@") ? null : identifier.trim();
  const compliant = isPasswordCompliant(password, username);
  const mismatch = confirm.length > 0 && confirm !== password;
  const canReset =
    code.length === 6 && compliant && confirm === password && !pending;

  const sendCode = async (isResend: boolean) => {
    const value = identifier.trim();
    if (!value || pending) return;
    setPending(true);
    setError(null);
    const result = await requestPasswordReset(value);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      if (result.retryAfterSeconds) startCooldown(result.retryAfterSeconds);
      return;
    }
    startCooldown(RESEND_SECONDS);
    setResent(isResend);
    if (!isResend) {
      setStep("reset");
      setCode("");
    }
  };

  const submitReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canReset) return;
    setPending(true);
    setError(null);
    const result = await resetPassword({
      identifier: identifier.trim(),
      code,
      newPassword: password,
    });
    if (!result.success) {
      setPending(false);
      setError(result.error);
      if (
        result.apiCode === "INVALID_CODE" ||
        result.apiCode === "CODE_EXPIRED"
      ) {
        setCode("");
      }
      return;
    }
    // Every session was revoked, this device's included.
    const session = await getSession().catch(() => null);
    if (session) {
      await secureSignOut({
        callbackUrl: `/${locale}/login?reason=password_reset`,
      });
      return;
    }
    setPending(false);
    setStep("done");
  };

  if (step === "done") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold">{t("doneTitle")}</CardTitle>
          <CardDescription>{t("doneDescription")}</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild className="h-10 w-full">
            <Link href="/login?reason=password_reset">{t("goToLogin")}</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === "reset") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-primary/10 text-primary mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
            <MailCheck className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {t("resetTitle")}
          </CardTitle>
          <CardDescription>
            {t("resetDescription", { identifier: identifier.trim() })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitReset} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="reset-code">{t("codeLabel")}</Label>
              <OtpInput
                id="reset-code"
                autoFocus
                value={code}
                onChange={setCode}
                onComplete={() => passwordRef.current?.focus()}
                disabled={pending}
                invalid={Boolean(error) && code.length < 6}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  {resent ? t("resent") : t("codeHint")}
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  disabled={pending || cooldown > 0}
                  onClick={() => void sendCode(true)}
                >
                  <RotateCw className="size-3" />
                  {cooldown > 0
                    ? t("resendIn", { time: formatCountdown(cooldown) })
                    : t("resend")}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">{t("newPassword")}</Label>
              <PasswordInput
                id="new-password"
                ref={passwordRef}
                autoComplete="new-password"
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
                aria-invalid={
                  password.length > 0 && !compliant ? true : undefined
                }
                className="h-10"
              />
              <PasswordRequirements password={password} username={username} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                maxLength={128}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={pending}
                aria-invalid={mismatch || undefined}
                className="h-10"
              />
              {mismatch && (
                <p className="text-destructive text-xs">
                  {tPassword("mismatch")}
                </p>
              )}
            </div>

            <p className="text-muted-foreground text-xs">
              {t("signOutNotice")}
            </p>

            {error && (
              <p role="alert" className="text-destructive text-sm font-medium">
                {error}
              </p>
            )}

            <Button type="submit" className="h-10 w-full" disabled={!canReset}>
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              {pending ? t("saving") : t("submitReset")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              setStep("identify");
              setError(null);
              setResent(false);
            }}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t("changeIdentifier")}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="bg-primary/10 text-primary mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
          <KeyRound className="size-6" />
        </div>
        <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendCode(false);
          }}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="identifier">{t("identifier")}</Label>
            <Input
              id="identifier"
              name="username"
              autoFocus
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={254}
              placeholder={t("identifierPlaceholder")}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={pending}
              aria-invalid={Boolean(error) || undefined}
              className="h-10"
            />
          </div>

          {error && (
            <p role="alert" className="text-destructive text-sm font-medium">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="h-10 w-full"
            disabled={pending || !identifier.trim() || cooldown > 0}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {cooldown > 0
              ? t("resendIn", { time: formatCountdown(cooldown) })
              : t("sendCode")}
          </Button>

          <p className="text-muted-foreground text-xs leading-relaxed">
            {t.rich("noEmail", {
              email: SUPPORT_EMAIL,
              link: (chunks) => (
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-primary font-medium hover:underline"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t py-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t("back")}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
