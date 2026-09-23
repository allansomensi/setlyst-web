"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/app-logo";
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
import { UsernameHint } from "@/components/auth/username-hint";
import { Loader2 } from "lucide-react";
import { isPasswordCompliant } from "@/lib/password-policy";
import { isValidUsername } from "@/lib/username-policy";
import { describeApiError } from "@/lib/api-errors";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const tErrors = useTranslations("apiErrors");
  const tPassword = useTranslations("passwordPolicy");
  const locale = useLocale();
  const router = useRouter();

  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    confirm: "",
  });
  const [accepted, setAccepted] = useState(false);

  const set =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const username = form.username.trim();
  const usernameValid = isValidUsername(username);
  const passwordValid = isPasswordCompliant(form.password, username);
  const confirmMismatch =
    form.confirm.length > 0 && form.confirm !== form.password;
  const emailInvalid =
    form.email.trim().length > 0 && !EMAIL_PATTERN.test(form.email.trim());

  const canSubmit =
    usernameValid &&
    passwordValid &&
    form.confirm === form.password &&
    !emailInvalid &&
    accepted;

  const [error, registerAction, isPending] = useActionState(
    async (): Promise<string | null> => {
      if (!canSubmit) return t("errors.incomplete");

      const payload: Record<string, string> = {
        username,
        password: form.password,
      };
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.first_name.trim()) payload.first_name = form.first_name.trim();
      if (form.last_name.trim()) payload.last_name = form.last_name.trim();

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

      try {
        const res = await fetch(`${apiUrl}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          if (res.status === 429) return t("errors.rateLimited");
          const body = (await res.json().catch(() => null)) as {
            code?: string;
            message?: string;
            meta?: Record<string, unknown>;
          } | null;
          const translated = describeApiError(
            body?.code,
            body?.meta,
            (k, v) => tErrors(k, v),
            locale,
          );
          if (translated) return translated;
          if (res.status === 400 && body?.message) return body.message;
          return res.status >= 500
            ? t("errors.serverError")
            : t("errors.generic");
        }

        router.push("/login?registered=true");
        return null;
      } catch {
        return t("errors.serverError");
      }
    },
    null,
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <AppLogo size={56} priority className="mx-auto mb-2 rounded-xl" />
        <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={registerAction} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="username">
              {t("username")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder={t("usernamePlaceholder")}
              required
              maxLength={20}
              disabled={isPending}
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
              value={form.username}
              onChange={set("username")}
              aria-invalid={username.length > 0 && !usernameValid}
              aria-describedby="username-hint"
            />
            <UsernameHint id="username-hint" username={username} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              disabled={isPending}
              autoComplete="email"
              value={form.email}
              onChange={set("email")}
              aria-invalid={emailInvalid}
            />
            {emailInvalid && (
              <p className="text-destructive text-xs">{t("errors.email")}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">{t("firstName")}</Label>
              <Input
                id="first_name"
                name="first_name"
                type="text"
                maxLength={50}
                placeholder={t("firstNamePlaceholder")}
                disabled={isPending}
                autoComplete="given-name"
                value={form.first_name}
                onChange={set("first_name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">{t("lastName")}</Label>
              <Input
                id="last_name"
                name="last_name"
                type="text"
                maxLength={50}
                placeholder={t("lastNamePlaceholder")}
                disabled={isPending}
                autoComplete="family-name"
                value={form.last_name}
                onChange={set("last_name")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {t("password")} <span className="text-destructive">*</span>
            </Label>
            <PasswordInput
              id="password"
              name="password"
              placeholder={t("passwordPlaceholder")}
              required
              maxLength={128}
              disabled={isPending}
              autoComplete="new-password"
              value={form.password}
              onChange={set("password")}
              aria-invalid={form.password.length > 0 && !passwordValid}
            />
            <PasswordRequirements
              password={form.password}
              username={username}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">
              {t("confirmPassword")} <span className="text-destructive">*</span>
            </Label>
            <PasswordInput
              id="confirm"
              name="confirm"
              required
              maxLength={128}
              disabled={isPending}
              autoComplete="new-password"
              value={form.confirm}
              onChange={set("confirm")}
              aria-invalid={confirmMismatch}
            />
            {confirmMismatch && (
              <p className="text-destructive text-xs">
                {tPassword("mismatch")}
              </p>
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary mt-0.5 h-4 w-4 shrink-0"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              disabled={isPending}
              required
            />
            <span className="text-muted-foreground">
              {t.rich("consent", {
                terms: (chunks) => (
                  <Link
                    href="/legal/terms"
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    {chunks}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link
                    href="/legal/privacy"
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </span>
          </label>

          {error && (
            <p
              role="alert"
              className="text-destructive text-center text-sm font-medium"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !canSubmit}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t py-4">
        <p className="text-muted-foreground text-sm">
          {t("alreadyHaveAccount")}{" "}
          <Link
            href="/login"
            className="text-primary font-medium hover:underline"
          >
            {t("signIn")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
