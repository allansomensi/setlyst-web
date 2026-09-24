"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
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
import {
  ReauthProofField,
  useReauthProof,
} from "@/components/auth/reauth-proof";
import { deleteOwnAccount } from "@/lib/actions/account";
import { toastActionError } from "@/lib/action-toast";
import { secureSignOut } from "@/lib/client-logout";
import { toast } from "@/lib/toast";

/**
 * "Excluir minha conta" (LGPD art. 18, VI): what happens, then a typed
 * confirmation (the username) and proof it's the account holder: the
 * password, or a code e-mailed on accounts without one.
 */
export function DeleteAccountSection({
  username,
  passwordSet,
  readOnly,
}: {
  username: string;
  passwordSet: boolean;
  readOnly: boolean;
}) {
  const t = useTranslations("account.delete");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const reauth = useReauthProof(passwordSet);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirmation.trim() === username;
  const canDelete = matches && reauth.complete && !pending;

  const close = () => {
    if (pending) return;
    setOpen(false);
    setConfirmation("");
    reauth.reset();
    setError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canDelete) return;
    setPending(true);
    setError(null);
    const result = await deleteOwnAccount({
      confirmation: confirmation.trim(),
      ...reauth.proof,
    });
    if (!result.success) {
      setPending(false);
      if (reauth.handleFailure(result)) {
        setError(result.error);
        return;
      }
      if (result.code) {
        toastActionError(result, result.error);
        return;
      }
      setError(result.error);
      return;
    }
    toast.success(t("deleted"));
    await secureSignOut({ callbackUrl: `/${locale}` });
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <TriangleAlert className="size-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="text-muted-foreground list-disc space-y-1.5 pl-5 text-sm">
          <li>{t("consequenceContent")}</li>
          <li>{t("consequenceBands")}</li>
          <li>{t("consequenceBilling")}</li>
          <li>{t("consequenceRefund")}</li>
          <li>{t("consequenceIrreversible")}</li>
        </ul>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-xs">{t("backupHint")}</p>
        <Button
          variant="destructive"
          onClick={() => setOpen(true)}
          disabled={readOnly}
          className="w-full sm:w-auto"
        >
          <Trash2 className="mr-2 size-4" />
          {t("action")}
        </Button>
      </CardFooter>

      <Dialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>
          {/* Consumer-law note (CDC art. 49 / Subscription Terms §8): a
              recent charge can still be withdrawn with a full refund, which
              has to happen before the account is gone. */}
          <p className="bg-muted/50 text-muted-foreground rounded-md border p-3 text-sm">
            {t("consequenceRefund")}
          </p>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              readOnly
              hidden
            />
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">
                {t.rich("typeUsername", {
                  username,
                  strong: (chunks) => (
                    <strong className="font-mono font-semibold">
                      {chunks}
                    </strong>
                  ),
                })}
              </Label>
              <Input
                id="delete-confirmation"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                autoFocus
                maxLength={64}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                disabled={pending}
                aria-invalid={
                  confirmation.length > 0 && !matches ? true : undefined
                }
                className="h-10 font-mono"
              />
            </div>
            <ReauthProofField
              state={reauth}
              id="delete-account"
              passwordLabel={t("password")}
              disabled={pending}
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
                onClick={close}
                disabled={pending}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" variant="destructive" disabled={!canDelete}>
                {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("confirm")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
