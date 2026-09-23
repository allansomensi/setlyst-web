"use client";

import { getSession } from "next-auth/react";
import { credentialsSignIn } from "@/lib/credentials-sign-in";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  CheckCircle2,
  Info,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppLogo } from "@/components/app-logo";
import { PasswordInput } from "@/components/auth/password-input";
import { OtpInput } from "@/components/auth/otp-input";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { toast } from "@/lib/toast";
import {
  attemptsLeftOf,
  parseSignInError,
  twoFactorChallengeOf,
  waitSecondsOf,
  type SignInError,
  type TwoFactorChallenge,
} from "@/lib/sign-in-errors";
import { isCompleteRecoveryCode, sanitizeRecoveryCode } from "@/lib/auth-flow";
import { describeApiError } from "@/lib/api-errors";
import { safeCallbackPath } from "@/lib/links";
import { takeGoogleTwoFactorChallenge } from "@/lib/actions/google-auth";
import { clearOfflineData } from "@/lib/offline/owner";

const NOTICES = [
  "registered",
  "password_changed",
  "password_reset",
  "signed_out_everywhere",
  "session",
  "expired",
] as const;
type Notice = (typeof NOTICES)[number];
const SUCCESS_NOTICES: readonly Notice[] = [
  "registered",
  "password_changed",
  "password_reset",
  "signed_out_everywhere",
];

/** next-auth's own `?error=` values for OAuth failures. */
const OAUTH_ERRORS = [
  "OAuthSignin",
  "OAuthCallback",
  "OAuthCreateAccount",
  "OAuthAccountNotLinked",
  "Callback",
  "AccessDenied",
  "Configuration",
];

function stripLocale(path: string, locale: string): string {
  return path.startsWith(`/${locale}/`) ? path.slice(locale.length + 1) : path;
}

type Step = "credentials" | "twoFactor" | "loadingChallenge";

interface InitialState {
  step: Step;
  error: SignInError | null;
  oauthFailed: boolean;
}

/**
 * What the URL asks for on arrival. After Google, `?step=2fa` only says a
 * second step is pending: the challenge itself waits in an httpOnly
 * cookie (see takeGoogleTwoFactorChallenge), never in the URL.
 */
function readInitialState(params: URLSearchParams): InitialState {
  const googleError = params.get("google_error");
  const nextAuthError = params.get("error");
  return {
    step: params.get("step") === "2fa" ? "loadingChallenge" : "credentials",
    error: googleError ? parseSignInError(googleError) : null,
    oauthFailed: Boolean(nextAuthError && OAUTH_ERRORS.includes(nextAuthError)),
  };
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations("auth.login");
  const tTwo = useTranslations("twoFactor");
  const tGoogle = useTranslations("googleAuth");
  const tErrors = useTranslations("apiErrors");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [initial] = useState(() => readInitialState(searchParams));
  const [step, setStep] = useState<Step>(initial.step);
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const [cookieCallbackPath, setCookieCallbackPath] = useState<string | null>(
    null,
  );
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [pending, setPending] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const challengeRequest = useRef<ReturnType<
    typeof takeGoogleTwoFactorChallenge
  > | null>(null);

  const reason = searchParams.get("reason");
  const notice: Notice | null =
    searchParams.get("registered") === "true"
      ? "registered"
      : NOTICES.includes(reason as Notice)
        ? (reason as Notice)
        : null;
  const callbackPath =
    cookieCallbackPath ?? safeCallbackPath(searchParams.get("callbackUrl"));

  const describe = (failure: SignInError): string => {
    const { code: failureCode, meta } = failure;
    const wait = waitSecondsOf(meta);
    const waitText = wait ? formatWait(wait) : null;
    switch (failureCode) {
      case "RATE_LIMITED":
        return waitText
          ? t("rateLimitedWait", { wait: waitText })
          : t("rateLimited");
      case "ACCOUNT_LOCKED":
        return waitText ? t("locked", { wait: waitText }) : t("lockedGeneric");
      case "SERVICE_UNAVAILABLE":
        return t("connectionError");
      case "INVALID_CREDENTIALS":
        return t("invalidCredentials");
      default: {
        if ((failureCode as string) === "EMAIL_TAKEN") {
          return tGoogle("emailTaken");
        }
        return (
          describeApiError(
            failureCode,
            meta,
            (k, v) => tErrors(k, v),
            locale,
          ) ?? t("invalidCredentials")
        );
      }
    }
  };

  const formatWait = (seconds: number): string => {
    if (seconds < 60) return t("wait.seconds", { count: Math.ceil(seconds) });
    if (seconds < 60 * 90) {
      return t("wait.minutes", { count: Math.ceil(seconds / 60) });
    }
    return t("wait.hours", { count: Math.ceil(seconds / 3600) });
  };

  // Arriving from Google: its outcome is shown once...
  const [error, setError] = useState<string | null>(() =>
    initial.error
      ? describe(initial.error)
      : initial.oauthFailed
        ? tGoogle("failed")
        : null,
  );

  // ...and the one-shot parameters leave the address bar (and history)
  // right away.
  useEffect(() => {
    if (
      searchParams.has("step") ||
      searchParams.has("google_error") ||
      searchParams.has("error")
    ) {
      const url = new URL(window.location.href);
      for (const key of ["step", "google_error", "error"]) {
        url.searchParams.delete(key);
      }
      window.history.replaceState(null, "", url.pathname + url.search);
    }
    // Runs once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arriving because the session ended (revoked, or expired while away):
  // the offline copy of the account's data goes too, as on a sign-out.
  // A shared device must not keep it readable until the next sign-in.
  useEffect(() => {
    if (reason === "session" || reason === "expired") {
      void clearOfflineData();
    }
    // Runs once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back from Google on an account with two-factor authentication: the
  // challenge is read (and cleared) server-side.
  useEffect(() => {
    if (initial.step !== "loadingChallenge") return;
    let cancelled = false;
    // Kept in a ref: the cookie can only be read once, and development
    // mode runs this effect twice.
    challengeRequest.current ??= takeGoogleTwoFactorChallenge();
    challengeRequest.current
      .then((next) => {
        if (cancelled) return;
        if (!next) {
          setStep("credentials");
          setError(tTwo("expired"));
          return;
        }
        setChallenge({ token: next.token, expiresAt: next.expiresAt });
        setCookieCallbackPath(next.callbackPath);
        setStep("twoFactor");
      })
      .catch(() => {
        if (cancelled) return;
        setStep("credentials");
        setError(t("connectionError"));
      });
    return () => {
      cancelled = true;
    };
    // Runs once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishSignIn = async () => {
    const session = await getSession();
    if (!session) {
      setError(t("connectionError"));
      setPending(false);
      return;
    }
    if (session.user?.mustChangePassword) {
      router.replace("/change-password");
      return;
    }
    if (session?.user?.isFirstLogin === false) {
      toast.success(t("welcomeBack"));
    }
    router.replace(
      callbackPath ? stripLocale(callbackPath, locale) : "/dashboard",
    );
    router.refresh();
  };

  const backToCredentials = (message: string | null) => {
    setStep("credentials");
    setChallenge(null);
    setCode("");
    setRecoveryCode("");
    setUseRecovery(false);
    setPassword("");
    setError(message);
  };

  const submitCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending || !identifier.trim() || !password) return;
    setPending(true);
    setError(null);
    try {
      const result = await credentialsSignIn({
        username: identifier.trim(),
        password,
      });
      if (result?.error) {
        const failure = parseSignInError(result.error);
        const next = twoFactorChallengeOf(failure);
        if (next) {
          setChallenge(next);
          setStep("twoFactor");
          setPending(false);
          return;
        }
        setError(describe(failure));
        setPending(false);
        return;
      }
      await finishSignIn();
    } catch {
      setError(t("connectionError"));
      setPending(false);
    }
  };

  const submitSecondFactor = async (appCode?: string) => {
    if (pending || !challenge) return;
    const typedCode = appCode ?? code;
    if (
      useRecovery
        ? !isCompleteRecoveryCode(recoveryCode)
        : typedCode.length !== 6
    ) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await credentialsSignIn({
        challengeToken: challenge.token,
        ...(useRecovery ? { recoveryCode } : { code: typedCode }),
      });
      if (result?.error) {
        const failure = parseSignInError(result.error);
        setPending(false);
        if (failure.code === "CODE_EXPIRED") {
          backToCredentials(tTwo("expired"));
          return;
        }
        if (failure.code === "INVALID_TWO_FACTOR_CODE") {
          const left = attemptsLeftOf(failure.meta);
          if (left === 0) {
            backToCredentials(tTwo("attemptsExhausted"));
            return;
          }
          setError(
            left != null
              ? tTwo("invalidAttempts", { count: left })
              : tTwo("invalid"),
          );
          setCode("");
          requestAnimationFrame(() => codeRef.current?.focus());
          return;
        }
        if (failure.code === "ACCOUNT_LOCKED") {
          backToCredentials(describe(failure));
          return;
        }
        setError(describe(failure));
        return;
      }
      await finishSignIn();
    } catch {
      setError(t("connectionError"));
      setPending(false);
    }
  };

  if (step === "loadingChallenge") {
    return (
      <Card className="w-full max-w-sm">
        <CardContent
          className="flex items-center justify-center py-12"
          role="status"
        >
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
          <span className="sr-only">{tTwo("loginTitle")}</span>
        </CardContent>
      </Card>
    );
  }

  if (step === "twoFactor" && challenge) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="bg-primary/10 text-primary mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
            {useRecovery ? (
              <KeyRound className="size-6" />
            ) : (
              <ShieldCheck className="size-6" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {tTwo("loginTitle")}
          </CardTitle>
          <CardDescription>
            {useRecovery
              ? tTwo("recoveryDescription")
              : tTwo("loginDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitSecondFactor();
            }}
            className="space-y-4"
            noValidate
          >
            {useRecovery ? (
              <div className="space-y-2">
                <Label htmlFor="recovery-code">{tTwo("recoveryLabel")}</Label>
                <Input
                  id="recovery-code"
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="XXXX-XXXX"
                  value={recoveryCode}
                  onChange={(e) =>
                    setRecoveryCode(sanitizeRecoveryCode(e.target.value))
                  }
                  disabled={pending}
                  aria-invalid={Boolean(error) || undefined}
                  aria-describedby={error ? "two-factor-error" : undefined}
                  className="h-12 text-center font-mono text-lg tracking-[0.3em] md:text-lg"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="two-factor-code">{tTwo("codeLabel")}</Label>
                <OtpInput
                  id="two-factor-code"
                  ref={codeRef}
                  autoFocus
                  value={code}
                  onChange={setCode}
                  onComplete={(value) => void submitSecondFactor(value)}
                  disabled={pending}
                  invalid={Boolean(error)}
                  aria-describedby={error ? "two-factor-error" : undefined}
                />
              </div>
            )}

            {error && (
              <p
                id="two-factor-error"
                role="alert"
                className="text-destructive text-center text-sm font-medium"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="h-10 w-full"
              disabled={
                pending ||
                (useRecovery
                  ? !isCompleteRecoveryCode(recoveryCode)
                  : code.length !== 6)
              }
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tTwo("verifying")}
                </>
              ) : (
                tTwo("verify")
              )}
            </Button>

            <Button
              type="button"
              variant="link"
              className="h-auto w-full p-0 text-sm"
              disabled={pending}
              onClick={() => {
                setUseRecovery((v) => !v);
                setError(null);
                setCode("");
                setRecoveryCode("");
              }}
            >
              {useRecovery ? tTwo("useApp") : tTwo("useRecovery")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => backToCredentials(null)}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {tTwo("back")}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <AppLogo size={56} priority className="mx-auto mb-2 rounded-xl" />
        <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notice && (
          <Alert
            variant={SUCCESS_NOTICES.includes(notice) ? "success" : "info"}
          >
            {SUCCESS_NOTICES.includes(notice) ? <CheckCircle2 /> : <Info />}
            <AlertDescription>{t(`notices.${notice}`)}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={submitCredentials} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="identifier">{t("identifier")}</Label>
            <Input
              id="identifier"
              name="username"
              type="text"
              placeholder={t("identifierPlaceholder")}
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
              required
              maxLength={254}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={pending}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? "login-error" : undefined}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("password")}</Label>
              <Link
                href="/forgot-password"
                className="text-muted-foreground hover:text-foreground text-sm hover:underline"
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              placeholder={t("passwordPlaceholder")}
              autoComplete="current-password"
              required
              maxLength={256}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? "login-error" : undefined}
              className="h-10"
            />
          </div>

          {error && (
            <p
              id="login-error"
              role="alert"
              className="text-destructive text-center text-sm font-medium"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="h-10 w-full"
            disabled={pending || !identifier.trim() || !password}
          >
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

        {googleEnabled && (
          <>
            <AuthDivider label={t("divider")} />
            <GoogleButton callbackPath={callbackPath} disabled={pending} />
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-center border-t py-4">
        <p className="text-muted-foreground text-sm">
          {t("noAccount")}{" "}
          <Link
            href="/register"
            className="text-primary font-medium hover:underline"
          >
            {t("signUp")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
