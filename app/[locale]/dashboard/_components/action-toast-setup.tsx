"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAppRouter } from "@/hooks/use-app-router";
import {
  registerUpgradeAction,
  registerVerifyEmailAction,
} from "@/lib/action-toast";
import { EmailChangeDialog } from "@/components/account/email-change-dialog";
import { EmailVerificationDialog } from "@/components/account/email-verification-dialog";

interface ActionToastSetupProps {
  /** The account's address, `null` when it has none. */
  email: string | null;
  passwordSet: boolean;
  username: string;
  /** Staff viewing as someone else: no account actions on their behalf. */
  readOnly: boolean;
}

/**
 * Gives lib/action-toast.tsx (which runs outside React) what its toast
 * actions need:
 *
 * - the localized "See plans" label and client-side navigation, for
 *   "limit reached" / "not in your plan" errors;
 * - "Resend verification e-mail" for `EMAIL_NOT_VERIFIED`: opens the
 *   verification dialog, which sends a new code right away (or, for an
 *   account without an address, the dialog that adds one).
 */
export function ActionToastSetup({
  email,
  passwordSet,
  username,
  readOnly,
}: ActionToastSetupProps) {
  const t = useTranslations("billing");
  const tVerify = useTranslations("emailVerification");
  const router = useAppRouter();
  const label = t("seePlans");
  const verifyLabel = email ? tVerify("resendAction") : tVerify("addAction");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    registerUpgradeAction({ label, navigate: (href) => router.push(href) });
    return () => registerUpgradeAction(null);
  }, [label, router]);

  useEffect(() => {
    if (readOnly) return;
    registerVerifyEmailAction({
      label: verifyLabel,
      open: () => (email ? setVerifyOpen(true) : setAddOpen(true)),
    });
    return () => registerVerifyEmailAction(null);
  }, [email, readOnly, verifyLabel]);

  if (readOnly) return null;

  return email ? (
    <EmailVerificationDialog
      open={verifyOpen}
      onOpenChange={setVerifyOpen}
      email={email}
      autoSend
    />
  ) : (
    <EmailChangeDialog
      open={addOpen}
      onOpenChange={setAddOpen}
      currentEmail={null}
      passwordSet={passwordSet}
      username={username}
    />
  );
}
