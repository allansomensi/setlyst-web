"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertTriangle,
  Check,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PasswordInput } from "@/components/auth/password-input";
import { OtpInput } from "@/components/auth/otp-input";
import { useAppRouter } from "@/hooks/use-app-router";
import {
  disableTwoFactor,
  enableTwoFactor,
  regenerateRecoveryCodes,
  startTwoFactorSetup,
} from "@/lib/actions/security";
import { toastActionError } from "@/lib/action-toast";
import { copyText } from "@/lib/clipboard";
import { formatApiDate } from "@/lib/dates";
import { toast } from "@/lib/toast";
import type { TwoFactorSetup } from "@/types/account";
import { RecoveryCodesPanel } from "./recovery-codes-panel";

interface TwoFactorCardProps {
  enabled: boolean;
  enabledAt: string | null;
  recoveryCodesRemaining: number;
  passwordSet: boolean;
  username: string;
}

/** Few enough recovery codes left to suggest generating new ones. */
const LOW_RECOVERY_CODES = 3;

export function TwoFactorCard({
  enabled,
  enabledAt,
  recoveryCodesRemaining,
  passwordSet,
  username,
}: TwoFactorCardProps) {
  const t = useTranslations("twoFactor");
  const locale = useLocale();
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const low = enabled && recoveryCodesRemaining <= LOW_RECOVERY_CODES;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Smartphone className="text-primary size-4" />
          {t("title")}
          {enabled ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <ShieldCheck />
              {t("statusOn")}
            </Badge>
          ) : (
            <Badge variant="outline">{t("statusOff")}</Badge>
          )}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      {enabled && (
        <CardContent className="space-y-3 text-sm">
          {enabledAt && (
            <p className="text-muted-foreground">
              {t("enabledSince", { date: formatApiDate(enabledAt, locale) })}
            </p>
          )}
          <div
            className={
              low
                ? "flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-100"
                : "flex items-start gap-2"
            }
          >
            {low ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            ) : (
              <KeyRound className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            )}
            <span>
              {t("recoveryRemaining", { count: recoveryCodesRemaining })}
              {low && <> {t("recoveryLow")}</>}
            </span>
          </div>
        </CardContent>
      )}
      <CardFooter className="flex flex-wrap gap-2">
        {enabled ? (
          <>
            <Button variant="outline" onClick={() => setRegenerateOpen(true)}>
              <RefreshCw className="mr-2 size-4" />
              {t("regenerate")}
            </Button>
            <Button variant="destructive" onClick={() => setDisableOpen(true)}>
              <ShieldOff className="mr-2 size-4" />
              {t("disable")}
            </Button>
          </>
        ) : (
          <Button onClick={() => setSetupOpen(true)}>
            <ShieldCheck className="mr-2 size-4" />
            {t("enable")}
          </Button>
        )}
      </CardFooter>

      {setupOpen && (
        <SetupDialog
          passwordSet={passwordSet}
          username={username}
          onClose={() => setSetupOpen(false)}
        />
      )}
      {disableOpen && (
        <DisableDialog
          passwordSet={passwordSet}
          username={username}
          onClose={() => setDisableOpen(false)}
        />
      )}
      {regenerateOpen && (
        <RegenerateDialog
          username={username}
          onClose={() => setRegenerateOpen(false)}
        />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------
// Setup wizard
// ---------------------------------------------------------------------

type SetupStep = "password" | "scan" | "verify" | "codes";

/** "ABCD EFGH IJKL..." for typing the secret by hand. */
function groupSecret(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

function SetupDialog({
  passwordSet,
  username,
  onClose,
}: {
  passwordSet: boolean;
  username: string;
  onClose: () => void;
}) {
  const t = useTranslations("twoFactor.setup");
  const router = useAppRouter();
  const { update } = useSession();
  const [step, setStep] = useState<SetupStep>("password");
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const stepIndex = ["password", "scan", "verify", "codes"].indexOf(step);

  const begin = async () => {
    setPending(true);
    setError(null);
    const result = await startTwoFactorSetup(
      passwordSet ? password : undefined,
    );
    setPending(false);
    if (!result.success || !result.data) {
      if (!result.success && result.code) {
        toastActionError(result, result.error);
        return;
      }
      setError(result.success ? null : result.error);
      return;
    }
    setSetup(result.data);
    setStep("scan");
  };

  const verify = async (value: string) => {
    if (value.length !== 6 || pending) return;
    setPending(true);
    setError(null);
    const result = await enableTwoFactor(value);
    setPending(false);
    if (!result.success || !result.data) {
      if (!result.success && result.apiCode === "CODE_EXPIRED") {
        setSetup(null);
        setCode("");
        setStep("password");
        setError(t("expired"));
        return;
      }
      if (!result.success && result.code) {
        toastActionError(result, result.error);
        return;
      }
      setError(result.success ? null : t("invalid"));
      setCode("");
      return;
    }
    setCodes(result.data.recovery_codes);
    setStep("codes");
    await update({ refreshAccount: true }).catch(() => null);
  };

  const finish = () => {
    toast.success(t("enabled"));
    onClose();
    router.refresh();
  };

  const copySecret = async () => {
    if (!setup) return;
    if (await copyText(setup.secret)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(t("copyFailed"));
    }
  };

  // Once enabled, closing before saving the codes would lose them.
  const canClose = !pending && (step !== "codes" || acknowledged);

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (next || !canClose) return;
        if (step === "codes") finish();
        else onClose();
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
        showCloseButton={canClose}
      >
        <DialogHeader>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {t("stepOf", { step: stepIndex + 1, total: 4 })}
          </p>
          <DialogTitle>{t(`${step}Title`)}</DialogTitle>
          <DialogDescription>{t(`${step}Description`)}</DialogDescription>
        </DialogHeader>

        {step === "password" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void begin();
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
            {passwordSet ? (
              <div className="space-y-2">
                <Label htmlFor="two-factor-password">{t("password")}</Label>
                <PasswordInput
                  id="two-factor-password"
                  autoComplete="current-password"
                  autoFocus
                  maxLength={256}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={pending}
                  className="h-10"
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t("noPassword")}</p>
            )}
            <p className="text-muted-foreground text-sm">{t("appsHint")}</p>
            {error && (
              <p role="alert" className="text-destructive text-sm font-medium">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={pending}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={pending || (passwordSet && !password)}
              >
                {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("continue")}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "scan" && setup && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="shrink-0 rounded-xl border bg-white p-3">
                <QRCodeSVG
                  value={setup.otpauth_url}
                  size={168}
                  marginSize={1}
                  level="M"
                  title={t("qrLabel")}
                />
              </div>
              <ol className="text-muted-foreground list-decimal space-y-1.5 pl-5 text-sm">
                <li>{t("scan1")}</li>
                <li>{t("scan2")}</li>
                <li>{t("scan3")}</li>
              </ol>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="two-factor-secret">{t("manual")}</Label>
              <div className="flex gap-2">
                <Input
                  id="two-factor-secret"
                  readOnly
                  value={groupSecret(setup.secret)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-10 font-mono text-sm tracking-wider"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={copySecret}
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  <span className="sr-only sm:not-sr-only">{t("copy")}</span>
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">{t("manualHint")}</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button type="button" onClick={() => setStep("verify")}>
                {t("next")}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "verify" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void verify(code);
            }}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="two-factor-confirm">{t("codeLabel")}</Label>
              <OtpInput
                id="two-factor-confirm"
                autoFocus
                value={code}
                onChange={setCode}
                onComplete={(value) => void verify(value)}
                disabled={pending}
                invalid={Boolean(error)}
              />
              {error && (
                <p
                  role="alert"
                  className="text-destructive text-sm font-medium"
                >
                  {error}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("scan");
                  setError(null);
                }}
                disabled={pending}
              >
                {t("back")}
              </Button>
              <Button type="submit" disabled={pending || code.length !== 6}>
                {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("activate")}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "codes" && (
          <div className="space-y-4">
            <RecoveryCodesPanel
              codes={codes}
              username={username}
              acknowledged={acknowledged}
              onAcknowledgedChange={setAcknowledged}
            />
            <DialogFooter>
              <Button type="button" onClick={finish} disabled={!acknowledged}>
                {t("finish")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------
// Disable
// ---------------------------------------------------------------------

function DisableDialog({
  passwordSet,
  username,
  onClose,
}: {
  passwordSet: boolean;
  username: string;
  onClose: () => void;
}) {
  const t = useTranslations("twoFactor.disableDialog");
  const router = useAppRouter();
  const { update } = useSession();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    (!passwordSet || password.length > 0) &&
    (/^\d{6}$/.test(code.trim()) ||
      /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/.test(code.trim()));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || pending) return;
    setPending(true);
    setError(null);
    const result = await disableTwoFactor({
      password: passwordSet ? password : undefined,
      code,
    });
    setPending(false);
    if (!result.success) {
      if (result.code) {
        toastActionError(result, result.error);
        return;
      }
      setError(result.error);
      return;
    }
    await update({ refreshAccount: true }).catch(() => null);
    toast.success(t("done"));
    onClose();
    router.refresh();
  };

  return (
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={username}
            readOnly
            hidden
          />
          {passwordSet && (
            <div className="space-y-2">
              <Label htmlFor="disable-password">{t("password")}</Label>
              <PasswordInput
                id="disable-password"
                autoComplete="current-password"
                autoFocus
                maxLength={256}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
                className="h-10"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="disable-code">{t("code")}</Label>
            <Input
              id="disable-code"
              autoComplete="one-time-code"
              autoFocus={!passwordSet}
              maxLength={9}
              spellCheck={false}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))
              }
              disabled={pending}
              className="h-10 font-mono tracking-widest"
            />
            <p className="text-muted-foreground text-xs">{t("codeHint")}</p>
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm font-medium">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!valid || pending}
            >
              {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------
// Regenerate recovery codes
// ---------------------------------------------------------------------

function RegenerateDialog({
  username,
  onClose,
}: {
  username: string;
  onClose: () => void;
}) {
  const t = useTranslations("twoFactor.regenerateDialog");
  const router = useAppRouter();
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (value: string) => {
    if (value.length !== 6 || pending) return;
    setPending(true);
    setError(null);
    const result = await regenerateRecoveryCodes(value);
    setPending(false);
    if (!result.success || !result.data) {
      if (!result.success && result.code) {
        toastActionError(result, result.error);
        return;
      }
      setError(result.success ? null : result.error);
      setCode("");
      return;
    }
    setCodes(result.data.recovery_codes);
  };

  const finish = () => {
    toast.success(t("done"));
    onClose();
    router.refresh();
  };

  const canClose = !pending && (!codes || acknowledged);

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (next || !canClose) return;
        if (codes) finish();
        else onClose();
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={canClose}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {codes ? t("newDescription") : t("description")}
          </DialogDescription>
        </DialogHeader>
        {codes ? (
          <div className="space-y-4">
            <RecoveryCodesPanel
              codes={codes}
              username={username}
              acknowledged={acknowledged}
              onAcknowledgedChange={setAcknowledged}
            />
            <DialogFooter>
              <Button type="button" onClick={finish} disabled={!acknowledged}>
                {t("finish")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void generate(code);
            }}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="regenerate-code">{t("code")}</Label>
              <OtpInput
                id="regenerate-code"
                autoFocus
                value={code}
                onChange={setCode}
                onComplete={(value) => void generate(value)}
                disabled={pending}
                invalid={Boolean(error)}
              />
              {error && (
                <p
                  role="alert"
                  className="text-destructive text-sm font-medium"
                >
                  {error}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={pending}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={pending || code.length !== 6}>
                {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("confirm")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
