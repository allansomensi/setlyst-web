"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CheckCircle2,
  Clock,
  Info,
  KeyRound,
  Link2Off,
  Loader2,
  LogOut,
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChangePasswordForm,
  PasswordNotSetNotice,
} from "@/components/auth/change-password-form";
import { GoogleButton, GoogleLogo } from "@/components/auth/google-button";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { useAppRouter } from "@/hooks/use-app-router";
import { revokeAllSessions, unlinkGoogle } from "@/lib/actions/security";
import { secureSignOut } from "@/lib/client-logout";
import { toastActionError } from "@/lib/action-toast";
import { formatApiDate, formatApiDateTime } from "@/lib/dates";
import { toast } from "@/lib/toast";
import type { LinkedIdentity, SecurityOverview } from "@/types/account";
import { TwoFactorCard } from "./two-factor-card";

/** Outcome of a "link Google" round trip (`?google=` on return). */
export type GoogleLinkStatus =
  "linked" | "mismatch" | "no_account" | "unverified" | "failed";

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
                  ? formatApiDateTime(security.last_login_at, locale)
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);

  // "linked" is only claimed when the API agrees: a Google account that
  // belongs to someone else may still come back as a challenge.
  const outcome: GoogleLinkStatus | null =
    status === "linked" && !linked ? "mismatch" : status;

  const unlink = async () => {
    setPending(true);
    const result = await unlinkGoogle();
    setPending(false);
    setConfirmOpen(false);
    if (!result.success) {
      if (result.apiCode === "PASSWORD_NOT_SET") {
        setNeedsPassword(true);
        return;
      }
      toastActionError(result, result.error);
      return;
    }
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

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("unlinkTitle")}
        description={t("unlinkDescription")}
        confirmLabel={t("unlink")}
        onConfirm={() => void unlink()}
        pending={pending}
        destructive
      />
    </Card>
  );
}
