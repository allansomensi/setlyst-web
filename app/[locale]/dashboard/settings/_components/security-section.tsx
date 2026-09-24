"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import {
  CheckCircle2,
  Clock,
  Info,
  KeyRound,
  Link2,
  Link2Off,
  Loader2,
  LogOut,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChangePasswordForm,
  PasswordNotSetNotice,
} from "@/components/auth/change-password-form";
import { GoogleButton, GoogleLogo } from "@/components/auth/google-button";
import {
  ReauthProofField,
  useReauthProof,
} from "@/components/auth/reauth-proof";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { useAppRouter } from "@/hooks/use-app-router";
import {
  cancelGoogleLink,
  linkGoogle,
  revokeAllSessions,
  unlinkGoogle,
} from "@/lib/actions/security";
import { secureSignOut } from "@/lib/client-logout";
import { toastActionError } from "@/lib/action-toast";
import { formatApiDate, formatApiDateTime } from "@/lib/dates";
import { toast } from "@/lib/toast";
import type { LinkedIdentity, SecurityOverview } from "@/types/account";
import { TwoFactorCard } from "./two-factor-card";

/** Outcome of a "link Google" round trip (`?google=` on return). */
export type GoogleLinkStatus =
  /** A Google account was chosen: confirm it's you to link it. */
  | "confirm"
  | "linked"
  | "mismatch"
  /** The chosen Google account waited too long (or was already used). */
  | "expired"
  | "failed";

interface SecuritySectionProps {
  username: string;
  passwordSet: boolean;
  passwordChangedAt: string | null;
  security: SecurityOverview | null;
  identities: LinkedIdentity[] | null;
  googleEnabled: boolean;
  googleStatus: GoogleLinkStatus | null;
  readOnly: boolean;
}

export function SecuritySection({
  username,
  passwordSet,
  passwordChangedAt,
  security,
  identities,
  googleEnabled,
  googleStatus,
  readOnly,
}: SecuritySectionProps) {
  const t = useTranslations("security");
  const locale = useLocale();
  const timeZone = useTimeZone();

  if (!security) {
    return (
      <Alert variant="warning">
        <TriangleAlert />
        <AlertDescription>{t("unavailable")}</AlertDescription>
      </Alert>
    );
  }

  const google = identities?.find((i) => i.provider === "google") ?? null;

  return (
    <div className="space-y-4">
      <StaffTwoFactorNotice
        twoFactorEnabled={security.two_factor_enabled}
        readOnly={readOnly}
      />
      {readOnly && (
        <Alert variant="info">
          <Info />
          <AlertDescription>{t("readOnly")}</AlertDescription>
        </Alert>
      )}
      <PasswordCard
        username={username}
        passwordSet={passwordSet}
        passwordChangedAt={passwordChangedAt}
      />
      <TwoFactorCard
        enabled={security.two_factor_enabled}
        enabledAt={security.two_factor_enabled_at}
        recoveryCodesRemaining={security.recovery_codes_remaining}
        passwordSet={passwordSet}
        username={username}
      />
      {(googleEnabled || security.has_google) && (
        <GoogleCard
          linked={security.has_google}
          identity={google}
          passwordSet={passwordSet}
          username={username}
          googleEnabled={googleEnabled && !readOnly}
          status={googleStatus}
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="text-primary size-4" />
            {t("activity.title")}
          </CardTitle>
          <CardDescription>{t("activity.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">
                {t("activity.lastLogin")}
              </dt>
              <dd className="font-medium">
                {security.last_login_at
                  ? formatApiDateTime(security.last_login_at, locale, timeZone)
                  : t("activity.never")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {t("activity.passwordChanged")}
              </dt>
              <dd className="font-medium">
                {!passwordSet
                  ? t("activity.noPassword")
                  : passwordChangedAt
                    ? formatApiDate(passwordChangedAt, locale)
                    : t("activity.never")}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <SessionsCard readOnly={readOnly} />
    </div>
  );
}

/**
 * Two-factor authentication is mandatory for staff accounts: until it is
 * on, the API refuses everything else (STAFF_TWO_FACTOR_REQUIRED) and the
 * app sends the account here (`?reason=staff2fa`). Says why, and brings
 * the section into view. Once 2FA is on (maybe from another device), the
 * session's copy of the flag is refreshed so the redirect stops.
 */
function StaffTwoFactorNotice({
  twoFactorEnabled,
  readOnly,
}: {
  twoFactorEnabled: boolean;
  readOnly: boolean;
}) {
  const t = useTranslations("security.staff2fa");
  const params = useSearchParams();
  const { data: session, update } = useSession();
  const router = useAppRouter();
  const ref = useRef<HTMLDivElement>(null);
  const refreshed = useRef(false);

  const role = session?.user?.role;
  const isStaff = role === "admin" || role === "moderator";
  const redirected = params.get("reason") === "staff2fa";
  const show = !readOnly && isStaff && !twoFactorEnabled;

  useEffect(() => {
    if (!redirected) return;
    const section = document.getElementById("security");
    (section ?? ref.current)?.scrollIntoView({ block: "start" });
  }, [redirected]);

  useEffect(() => {
    if (
      readOnly ||
      !isStaff ||
      !twoFactorEnabled ||
      session?.user?.twoFactorEnabled !== false ||
      refreshed.current
    ) {
      return;
    }
    refreshed.current = true;
    void update({ refreshAccount: true })
      .then(() => router.refresh())
      .catch(() => null);
  }, [
    isStaff,
    readOnly,
    router,
    session?.user?.twoFactorEnabled,
    twoFactorEnabled,
    update,
  ]);

  if (!show) return null;

  return (
    <div ref={ref}>
      <Alert variant="warning">
        <ShieldAlert />
        <AlertDescription>
          <p className="font-medium">{t("title")}</p>
          <p>{t("description")}</p>
        </AlertDescription>
      </Alert>
    </div>
  );
}

/** "Sign out everywhere": revokes every session, then signs this device out. */
function SessionsCard({ readOnly }: { readOnly: boolean }) {
  const t = useTranslations("security.sessions");
  const locale = useLocale();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const signOutEverywhere = async () => {
    setPending(true);
    const result = await revokeAllSessions();
    if (!result.success) {
      setPending(false);
      setConfirmOpen(false);
      toastActionError(result, result.error);
      return;
    }
    await secureSignOut({
      callbackUrl: `/${locale}/login?reason=signed_out_everywhere`,
    });
  };

  return (
    <Card id="sessions" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogOut className="text-primary size-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button
          variant="outline"
          onClick={() => setConfirmOpen(true)}
          disabled={readOnly || pending}
        >
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 size-4" />
          )}
          {t("action")}
        </Button>
      </CardFooter>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => !pending && setConfirmOpen(open)}
        title={t("confirmTitle")}
        description={t("confirmDescription")}
        confirmLabel={t("confirm")}
        onConfirm={() => void signOutEverywhere()}
        pending={pending}
        destructive
      />
    </Card>
  );
}

function PasswordCard({
  username,
  passwordSet,
  passwordChangedAt,
}: {
  username: string;
  passwordSet: boolean;
  passwordChangedAt: string | null;
}) {
  const t = useTranslations("security.password");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <Card id="password" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="text-primary size-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {passwordSet ? t("description") : t("descriptionNotSet")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {passwordSet ? (
          <p className="text-muted-foreground text-sm">
            {passwordChangedAt
              ? t("changedOn", {
                  date: formatApiDate(passwordChangedAt, locale),
                })
              : t("neverChanged")}
          </p>
        ) : (
          <PasswordNotSetNotice username={username} />
        )}
      </CardContent>
      {passwordSet && (
        <CardFooter>
          <Button variant="outline" onClick={() => setOpen(true)}>
            <KeyRound className="mr-2 size-4" />
            {t("change")}
          </Button>
        </CardFooter>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5" />
              {t("change")}
            </DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>
          {open && (
            <ChangePasswordForm
              username={username}
              secondaryAction={
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  {tCommon("cancel")}
                </Button>
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function GoogleCard({
  linked,
  identity,
  passwordSet,
  username,
  googleEnabled,
  status,
}: {
  linked: boolean;
  identity: LinkedIdentity | null;
  passwordSet: boolean;
  username: string;
  googleEnabled: boolean;
  status: GoogleLinkStatus | null;
}) {
  const t = useTranslations("security.google");
  const locale = useLocale();
  const router = useAppRouter();
  const tCommon = useTranslations("common");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reauth = useReauthProof(passwordSet);
  // Back from Google with an account chosen: ask for the proof right away.
  const [linkOpen, setLinkOpen] = useState(
    status === "confirm" && !linked && googleEnabled,
  );
  const [linkOutcome, setLinkOutcome] = useState<GoogleLinkStatus | null>(null);

  // "linked" is only claimed when the API agrees.
  const fromUrl: GoogleLinkStatus | null =
    status === "confirm"
      ? null
      : status === "linked" && !linked
        ? null
        : status;
  const outcome = linkOutcome ?? fromUrl;

  /** Drops `?google=` so a reload doesn't replay the outcome. */
  const clearStatusParam = () => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("google")) return;
    url.searchParams.delete("google");
    window.history.replaceState(null, "", url);
  };

  const closeLink = () => {
    if (pending) return;
    setLinkOpen(false);
    setError(null);
    reauth.reset();
    clearStatusParam();
    void cancelGoogleLink();
  };

  const link = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending || !reauth.complete) return;
    setPending(true);
    setError(null);
    const result = await linkGoogle(reauth.proof);
    setPending(false);
    if (!result.success) {
      if (reauth.handleFailure(result)) {
        setError(result.error);
        return;
      }
      setLinkOpen(false);
      reauth.reset();
      clearStatusParam();
      switch (result.apiCode) {
        case "ALREADY_EXISTS":
          setLinkOutcome("mismatch");
          return;
        case "GOOGLE_LINK_EXPIRED":
        case "INVALID_GOOGLE_TOKEN":
          setLinkOutcome("expired");
          return;
        default:
          toastActionError(result, result.error);
          return;
      }
    }
    setLinkOpen(false);
    reauth.reset();
    clearStatusParam();
    setLinkOutcome(null);
    toast.success(t("status.linked"));
    router.refresh();
  };

  const closeDialog = () => {
    if (pending) return;
    setConfirmOpen(false);
    setError(null);
    reauth.reset();
  };

  const unlink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending || !reauth.complete) return;
    setPending(true);
    setError(null);
    const result = await unlinkGoogle(reauth.proof);
    setPending(false);
    if (!result.success) {
      if (reauth.handleFailure(result)) {
        setError(result.error);
        return;
      }
      setConfirmOpen(false);
      reauth.reset();
      if (result.apiCode === "PASSWORD_NOT_SET") {
        setNeedsPassword(true);
        return;
      }
      toastActionError(result, result.error);
      return;
    }
    setConfirmOpen(false);
    reauth.reset();
    toast.success(t("unlinked"));
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span className="flex size-5 items-center justify-center">
            <GoogleLogo className="size-4" />
          </span>
          {t("title")}
          {linked ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              {t("linked")}
            </Badge>
          ) : (
            <Badge variant="outline">{t("notLinked")}</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {linked ? t("descriptionLinked") : t("descriptionNotLinked")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {outcome && (
          <Alert variant={outcome === "linked" ? "success" : "warning"}>
            {outcome === "linked" ? <CheckCircle2 /> : <TriangleAlert />}
            <AlertDescription>{t(`status.${outcome}`)}</AlertDescription>
          </Alert>
        )}
        {linked && identity && (
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="text-muted-foreground">{t("account")}</dt>
              <dd className="truncate font-medium">
                {identity.email ?? t("noEmail")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("since")}</dt>
              <dd className="font-medium">
                {formatApiDate(identity.created_at, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("lastUsed")}</dt>
              <dd className="font-medium">
                {identity.last_used_at
                  ? formatApiDate(identity.last_used_at, locale)
                  : t("never")}
              </dd>
            </div>
          </dl>
        )}
        {(needsPassword || (linked && !passwordSet)) && (
          <PasswordNotSetNotice username={username} />
        )}
      </CardContent>
      <CardFooter>
        {linked ? (
          <Button
            variant="outline"
            onClick={() => setConfirmOpen(true)}
            disabled={!passwordSet || pending}
          >
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Link2Off className="mr-2 size-4" />
            )}
            {t("unlink")}
          </Button>
        ) : googleEnabled ? (
          <GoogleButton
            mode="link"
            label={t("link")}
            className="w-full sm:w-auto"
          />
        ) : null}
      </CardFooter>

      <Dialog
        open={linkOpen}
        onOpenChange={(next) => (next ? setLinkOpen(true) : closeLink())}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="size-5" aria-hidden />
              {t("linkTitle")}
            </DialogTitle>
            <DialogDescription>
              {passwordSet ? t("linkDescription") : t("linkDescriptionCode")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={link} className="space-y-4" noValidate>
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              readOnly
              hidden
            />
            <ReauthProofField
              state={reauth}
              id="link-google"
              passwordLabel={t("unlinkPassword")}
              disabled={pending}
              autoFocus
            />
            {error && (
              <p role="alert" className="text-destructive text-sm font-medium">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeLink}
                disabled={pending}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={pending || !reauth.complete}>
                {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("linkConfirm")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onOpenChange={(next) => (next ? setConfirmOpen(true) : closeDialog())}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("unlinkTitle")}</DialogTitle>
            <DialogDescription>{t("unlinkDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={unlink} className="space-y-4" noValidate>
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              readOnly
              hidden
            />
            <ReauthProofField
              state={reauth}
              id="unlink-google"
              passwordLabel={t("unlinkPassword")}
              disabled={pending}
              autoFocus
            />
            {error && (
              <p role="alert" className="text-destructive text-sm font-medium">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={pending}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={pending || !reauth.complete}
              >
                {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("unlink")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
