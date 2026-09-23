"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { reportUser } from "@/lib/actions/account";
import { toastActionError } from "@/lib/action-toast";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { REPORT_REASONS, type ReportReason } from "@/types/account";

const DETAILS_MAX = 500;

/** "Denunciar perfil": a reason, optional details, sent to moderation. */
export function ReportProfileButton({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const t = useTranslations("userProfile.report");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const close = () => {
    if (pending) return;
    setOpen(false);
    setReason(null);
    setDetails("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason || pending) return;
    setPending(true);
    const result = await reportUser({ userId, reason, details });
    setPending(false);
    if (!result.success) {
      if (result.apiCode === "ALREADY_EXISTS") {
        toast.info(t("alreadyReported"));
        setDone(true);
        close();
        return;
      }
      toastActionError(result, result.error);
      return;
    }
    toast.success(t("sent"));
    setDone(true);
    setOpen(false);
    setReason(null);
    setDetails("");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
        disabled={done}
      >
        <Flag className="mr-1.5 size-4" />
        {done ? t("reported") : t("action")}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("title", { username })}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">
                {t("reasonLabel")}
              </legend>
              {REPORT_REASONS.map((value) => (
                <label
                  key={value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors",
                    reason === value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50",
                  )}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                    disabled={pending}
                    className="accent-primary mt-0.5 size-4 shrink-0"
                  />
                  <span>
                    <span className="block font-medium">
                      {t(`reasons.${value}.label`)}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {t(`reasons.${value}.hint`)}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="report-details">{t("detailsLabel")}</Label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {details.length}/{DETAILS_MAX}
                </span>
              </div>
              <Textarea
                id="report-details"
                rows={3}
                maxLength={DETAILS_MAX}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t("detailsPlaceholder")}
                disabled={pending}
              />
            </div>
            <p className="text-muted-foreground text-xs">{t("privacy")}</p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={close}
                disabled={pending}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={!reason || pending}
              >
                {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
