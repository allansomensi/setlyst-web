"use client";

import { useState, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import {
  ExternalLink,
  FileCheck2,
  Loader2,
  LogOut,
  MailWarning,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@/components/nav-link";
import { EmailVerificationDialog } from "@/components/account/email-verification-dialog";
import { EmailChangeDialog } from "@/components/account/email-change-dialog";
import { useAppRouter } from "@/hooks/use-app-router";
import { acceptCurrentTerms } from "@/lib/actions/account";
import { toastActionError } from "@/lib/action-toast";
import { secureSignOut } from "@/lib/client-logout";
import { LEGAL_HREFS, LEGAL_VERSION } from "@/lib/legal";
import { toast } from "@/lib/toast";
import { formatApiDay } from "@/lib/dates";

export interface AccountGatesProps {
  username: string;
  email: string | null;
  /** `false` also when the account has no address at all. */
  emailVerified: boolean;
  /** The Terms of Use in force were accepted (`terms_version`). */
  termsAccepted: boolean;
  passwordSet: boolean;
  /** Staff viewing as someone else: never prompt on their behalf. */
  readOnly: boolean;
}

/**
 * Account prompts mounted once by the dashboard layout:
 *
 * - a blocking modal until the Terms of Use / Privacy Policy in force are
 *   accepted (it can't be dismissed; "Sair" signs out);
 * - a dismissible banner (for this browser session) while the e-mail
 *   address isn't verified, or when the account has none.
 */
export function AccountGates(props: AccountGatesProps) {
  if (props.readOnly) return null;
  return (
    <>
      {!props.termsAccepted && <TermsGate />}
      {!props.emailVerified && (
        <EmailBanner
          username={props.username}
          email={props.email}
          passwordSet={props.passwordSet}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------
// E-mail banner
// ---------------------------------------------------------------------

const DISMISS_KEY = "setlyst:email-banner-dismissed";

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

const subscribeStorage = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

function EmailBanner({
  username,
  email,
  passwordSet,
}: {
  username: string;
  email: string | null;
  passwordSet: boolean;
}) {
  const t = useTranslations("emailVerification.banner");
  const storedDismissal = useSyncExternalStore(
    subscribeStorage,
    readDismissed,
    () => false,
  );
  const [dismissed, setDismissed] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Private mode: hidden until the next page load only.
    }
  };

  const hidden = dismissed || storedDismissal;

  return (
    <>
      {!hidden && (
        <div
          role="region"
          aria-label={t("label")}
          className="flex items-start gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-950 md:items-center md:px-8 dark:text-amber-100"
        >
          <MailWarning className="mt-0.5 size-4 shrink-0 text-amber-600 md:mt-0 dark:text-amber-400" />
          <p className="min-w-0 flex-1">
            {email ? (
              <>
                <span className="font-medium">{t("title")}</span>{" "}
                <span className="text-amber-900/80 dark:text-amber-100/80">
                  {t("description", { email })}
                </span>
              </>
            ) : (
              <>
                <span className="font-medium">{t("noEmailTitle")}</span>{" "}
                <span className="text-amber-900/80 dark:text-amber-100/80">
                  {t("noEmailDescription")}
                </span>
              </>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              className="h-7 bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"
              onClick={() =>
                email ? setVerifyOpen(true) : setChangeOpen(true)
              }
            >
              {email ? t("verify") : t("addEmail")}
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-amber-900 hover:bg-amber-500/20 dark:text-amber-100"
              onClick={dismiss}
            >
              <X aria-hidden />
              <span className="sr-only">{t("dismiss")}</span>
            </Button>
          </div>
        </div>
      )}

      {email && (
        <EmailVerificationDialog
          open={verifyOpen}
          onOpenChange={setVerifyOpen}
          email={email}
        />
      )}
      <EmailChangeDialog
        open={changeOpen}
        onOpenChange={setChangeOpen}
        currentEmail={email}
        passwordSet={passwordSet}
        username={username}
      />
    </>
  );
}

// ---------------------------------------------------------------------
// Terms re-acceptance
// ---------------------------------------------------------------------

function TermsGate() {
  const t = useTranslations("terms.gate");
  const locale = useLocale();
  const router = useAppRouter();
  const { update } = useSession();
  const [open, setOpen] = useState(true);
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const effective = formatApiDay(LEGAL_VERSION, locale);

  const accept = async () => {
    if (!checked || pending) return;
    setPending(true);
    const result = await acceptCurrentTerms();
    if (!result.success) {
      setPending(false);
      toastActionError(result, result.error);
      return;
    }
    await update({ refreshAccount: true }).catch(() => null);
    setOpen(false);
    toast.success(t("accepted"));
    router.refresh();
  };

  const leave = async () => {
    setLeaving(true);
    await secureSignOut({ callbackUrl: `/${locale}/login` });
  };

  const docLink = (href: string) =>
    function DocLink(chunks: React.ReactNode) {
      return (
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-0.5 font-medium underline-offset-4 hover:underline"
        >
          {chunks}
          <ExternalLink aria-hidden className="size-3" />
        </Link>
      );
    };

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        className="sm:max-w-lg"
      >
        <DialogHeader>
          <div className="bg-primary/10 text-primary mb-1 flex size-10 items-center justify-center rounded-full">
            <FileCheck2 className="size-5" />
          </div>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { date: effective })}
          </DialogDescription>
        </DialogHeader>

        <ul className="text-muted-foreground list-disc space-y-1.5 pl-5 text-sm">
          <li>{t.rich("readTerms", { link: docLink(LEGAL_HREFS.terms) })}</li>
          <li>
            {t.rich("readPrivacy", { link: docLink(LEGAL_HREFS.privacy) })}
          </li>
        </ul>

        <label className="bg-muted/40 flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
            disabled={pending || leaving}
            className="border-input accent-primary focus-visible:ring-ring/50 mt-0.5 size-4 shrink-0 cursor-pointer rounded outline-none focus-visible:ring-3"
          />
          <span className="leading-snug">{t("checkbox")}</span>
        </label>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => void leave()}
            disabled={pending || leaving}
          >
            {leaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            {t("signOut")}
          </Button>
          <Button
            type="button"
            onClick={() => void accept()}
            disabled={!checked || pending || leaving}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("accept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
