"use client";

import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import { credentialsSignIn } from "@/lib/credentials-sign-in";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Gift, Loader2, Sparkles } from "lucide-react";
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
import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { TermsConsent } from "@/components/legal/terms-consent";
import { isPasswordCompliant } from "@/lib/password-policy";
import { isValidUsername } from "@/lib/username-policy";
import { registerAccount } from "@/lib/actions/public-auth";
import { normalizeReferralCode, referralCookieString } from "@/lib/auth-flow";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RegisterFormProps {
  googleEnabled: boolean;
  /** From `?ref=` or a code remembered from an earlier visit. */
  initialReferral: string | null;
  /** The `?ref=` of this visit, to remember for later. */
  referralFromLink: string | null;
  /** Name of the plan chosen on the pricing page, if any. */
  planName: string | null;
  billingEnforced: boolean;
  /**
   * Where the visitor was going (an invite link, Live Mode...): carried
   * through sign-up and back to the login page, so it isn't lost.
   */
  callbackPath: string | null;
}

function stripLocale(path: string, locale: string): string {
  return path.startsWith(`/${locale}/`) ? path.slice(locale.length + 1) : path;
}

export function RegisterForm({
  googleEnabled,
  initialReferral,
  referralFromLink,
  planName,
  billingEnforced,
  callbackPath,
}: RegisterFormProps) {
  const t = useTranslations("auth.register");
  const locale = useLocale();
  const tPassword = useTranslations("passwordPolicy");
  const router = useRouter();

  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    confirm: "",
  });
  const [referral, setReferral] = useState(initialReferral ?? "");
  const [showReferral, setShowReferral] = useState(Boolean(initialReferral));
  const [accepted, setAccepted] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remember the invitation for a while: people often read the pricing
  // page or leave for Google before actually signing up.
  useEffect(() => {
    if (!referralFromLink) return;
    try {
      document.cookie = referralCookieString(
        referralFromLink,
        window.location.protocol === "https:",
      );
    } catch {
      // Cookies disabled: the code is still in the form.
    }
  }, [referralFromLink]);

  const set =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const username = form.username.trim();
  const email = form.email.trim();
  const usernameValid = isValidUsername(username);
  const passwordValid = isPasswordCompliant(form.password, username);
  const confirmMismatch =
    form.confirm.length > 0 && form.confirm !== form.password;
  const emailValid = EMAIL_PATTERN.test(email);
  const showEmailError = (attempted || email.length > 0) && !emailValid;

  const canSubmit =
    usernameValid &&
    emailValid &&
    passwordValid &&
    form.confirm === form.password &&
    accepted;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (!canSubmit || pending) {
      if (!canSubmit) setError(t("errors.incomplete"));
      return;
    }
    setPending(true);
    setError(null);

    const result = await registerAccount({
      username,
      email,
      password: form.password,
      firstName: form.first_name,
      lastName: form.last_name,
      acceptTerms: true,
      ageConfirmed: true,
      marketingOptIn: marketing,
      referralCode: normalizeReferralCode(referral),
    });

    if (!result.success) {
      setError(result.error);
      setPending(false);
      return;
    }

    // Straight in: the dashboard then asks for the e-mail code that was
    // just sent.
    const login = await credentialsSignIn({
      username,
      password: form.password,
    }).catch(() => null);
    const session = login && !login.error ? await getSession() : null;

    if (!session) {
      // Signing in has to happen by hand (e-mail confirmation first, a
      // hiccup): the login page still knows where to go afterwards.
      router.push({
        pathname: "/login",
        query: {
          registered: "true",
          ...(callbackPath ? { callbackUrl: callbackPath } : {}),
        },
      });
      return;
    }
    toast.success(t("success", { email }));
    router.replace(
      callbackPath ? stripLocale(callbackPath, locale) : "/dashboard",
    );
    router.refresh();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <AppLogo size={56} priority className="mx-auto mb-2 rounded-xl" />
        <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {billingEnforced && (
          <div className="border-primary/30 bg-primary/10 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm">
            <Gift className="text-primary mt-0.5 size-4 shrink-0" />
            <p>
              <span className="font-semibold">{t("trialTitle")}</span>{" "}
              <span className="text-muted-foreground">{t("trialBody")}</span>
            </p>
          </div>
        )}

        {planName && (
          <div className="border-primary/25 bg-primary/5 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm">
            <Sparkles className="text-primary mt-0.5 size-4 shrink-0" />
            <p>
              <span className="font-medium">
                {t("planChosen", { plan: planName })}
              </span>{" "}
              <span className="text-muted-foreground">
                {billingEnforced ? t("planNoteEnforced") : t("planNote")}
              </span>
            </p>
          </div>
        )}

        {googleEnabled && (
          <>
            <GoogleButton
              label={t("google")}
              referralCode={normalizeReferralCode(referral)}
              acceptTerms={accepted}
              marketingOptIn={marketing}
              callbackPath={callbackPath}
              disabled={pending}
            />
            <AuthDivider label={t("divider")} />
          </>
        )}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">
              {t("email")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              required
              maxLength={254}
              disabled={pending}
              autoComplete="email"
              value={form.email}
              onChange={set("email")}
              aria-invalid={showEmailError || undefined}
              aria-describedby="email-hint"
              className="h-10"
            />
            <p
              id="email-hint"
              className={cn(
                "text-xs",
                showEmailError ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {showEmailError ? t("errors.email") : t("emailHint")}
            </p>
          </div>

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
              disabled={pending}
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
              value={form.username}
              onChange={set("username")}
              aria-invalid={
                (username.length > 0 || attempted) && !usernameValid
                  ? true
                  : undefined
              }
              aria-describedby="username-hint"
              className="h-10"
            />
            <UsernameHint id="username-hint" username={username} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                {t("firstName")}{" "}
                <span className="text-muted-foreground font-normal">
                  {t("optional")}
                </span>
              </Label>
              <Input
                id="first_name"
                name="first_name"
                type="text"
                maxLength={50}
                placeholder={t("firstNamePlaceholder")}
                disabled={pending}
                autoComplete="given-name"
                value={form.first_name}
                onChange={set("first_name")}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">
                {t("lastName")}{" "}
                <span className="text-muted-foreground font-normal">
                  {t("optional")}
                </span>
              </Label>
              <Input
                id="last_name"
                name="last_name"
                type="text"
                maxLength={50}
                placeholder={t("lastNamePlaceholder")}
                disabled={pending}
                autoComplete="family-name"
                value={form.last_name}
                onChange={set("last_name")}
                className="h-10"
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
              disabled={pending}
              autoComplete="new-password"
              value={form.password}
              onChange={set("password")}
              aria-invalid={
                (form.password.length > 0 || attempted) && !passwordValid
                  ? true
                  : undefined
              }
              className="h-10"
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
              disabled={pending}
              autoComplete="new-password"
              value={form.confirm}
              onChange={set("confirm")}
              aria-invalid={confirmMismatch || undefined}
              className="h-10"
            />
            {confirmMismatch && (
              <p className="text-destructive text-xs">
                {tPassword("mismatch")}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-dashed">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm outline-none focus-visible:ring-3"
              aria-expanded={showReferral}
              aria-controls="referral-field"
              onClick={() => setShowReferral((v) => !v)}
            >
              <Gift className="size-4 shrink-0" />
              <span className="flex-1">{t("referralToggle")}</span>
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  showReferral && "rotate-180",
                )}
              />
            </button>
            {showReferral && (
              <div id="referral-field" className="space-y-2 px-3 pb-3">
                <Label htmlFor="referral" className="sr-only">
                  {t("referral")}
                </Label>
                <Input
                  id="referral"
                  name="referral_code"
                  placeholder={t("referralPlaceholder")}
                  maxLength={32}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={pending}
                  value={referral}
                  onChange={(e) =>
                    setReferral(e.target.value.toUpperCase().slice(0, 32))
                  }
                  className="h-10 font-mono tracking-wider uppercase"
                />
                <p className="text-muted-foreground text-xs">
                  {t("referralHint")}
                </p>
              </div>
            )}
          </div>

          <TermsConsent
            accepted={accepted}
            onAcceptedChange={setAccepted}
            marketing={marketing}
            onMarketingChange={setMarketing}
            invalid={attempted && !accepted}
            disabled={pending}
          />

          {error && (
            <p
              role="alert"
              className="text-destructive text-center text-sm font-medium"
            >
              {error}
            </p>
          )}

          <Button type="submit" className="h-10 w-full" disabled={pending}>
            {pending ? (
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
            href={
              callbackPath
                ? { pathname: "/login", query: { callbackUrl: callbackPath } }
                : "/login"
            }
            className="text-primary font-medium hover:underline"
          >
            {t("signIn")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
