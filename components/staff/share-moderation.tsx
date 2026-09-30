"use client";

import { useState, useTransition } from "react";
import { Globe, Link2Off, Lock, LockOpen, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  revokeShare,
  unlockShare,
} from "@/app/[locale]/dashboard/admin/actions";
import { toastActionError } from "@/lib/action-toast";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./confirm-dialog";

const REASON_MAX = 500;

export interface ShareState {
  kind: "setlist" | "gig";
  id: string;
  title: string;
  share_token: string | null;
  share_locked_at: string | null;
  share_lock_reason: string | null;
}

/** "Public" / "Taken down" / "Private" at a glance. */
export function ShareStatusBadge({
  state,
}: {
  state: Pick<ShareState, "share_token" | "share_locked_at">;
}) {
  const t = useTranslations("staff.share");
  if (state.share_locked_at) {
    return (
      <Badge variant="destructive">
        <Lock />
        {t("locked")}
      </Badge>
    );
  }
  if (state.share_token) {
    return (
      <Badge
        variant="outline"
        className="border-sky-500/30 text-sky-700 dark:text-sky-300"
      >
        <Globe />
        {t("public")}
      </Badge>
    );
  }
  return <Badge variant="secondary">{t("private")}</Badge>;
}

/**
 * Take a public link down immediately (the owner is notified, with the
 * reason, and can't re-share until staff allow it) — or lift that lock.
 */
export function ShareModerationButton({
  state,
  size = "sm",
  compact = false,
}: {
  state: ShareState;
  size?: "sm" | "default";
  /**
   * Icon only on a phone (the name stays as the accessible label and
   * tooltip), for a table row that would otherwise push it off screen.
   */
  compact?: boolean;
}) {
  const t = useTranslations("staff.share");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const locked = Boolean(state.share_locked_at);

  const confirm = () => {
    startTransition(async () => {
      const result = locked
        ? await unlockShare(state.kind, state.id)
        : await revokeShare(state.kind, state.id, reason);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(
        locked
          ? t("unlocked", { title: state.title })
          : t("revoked", { title: state.title }),
      );
      setOpen(false);
      setReason("");
    });
  };

  const label = locked
    ? t("unlock")
    : state.share_token
      ? t("revoke")
      : t("lock");
  const iconClass = cn("h-4 w-4", compact ? "sm:mr-1.5" : "mr-1.5");

  return (
    <>
      <Button
        variant="outline"
        size={size}
        onClick={() => setOpen(true)}
        title={compact ? label : undefined}
        className={cn(
          !locked && "text-destructive hover:text-destructive",
          compact && "max-sm:px-2.5",
        )}
      >
        {locked ? (
          <LockOpen className={iconClass} aria-hidden />
        ) : state.share_token ? (
          <Link2Off className={iconClass} aria-hidden />
        ) : (
          <ShieldAlert className={iconClass} aria-hidden />
        )}
        <span className={cn(compact && "max-sm:sr-only")}>{label}</span>
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setReason("");
        }}
        title={
          locked
            ? t("unlockTitle", { title: state.title })
            : t("revokeTitle", { title: state.title })
        }
        description={locked ? t("unlockDescription") : t("revokeDescription")}
        confirmLabel={
          locked ? t("unlock") : state.share_token ? t("revoke") : t("lock")
        }
        destructive={!locked}
        pending={isPending}
        onConfirm={confirm}
      >
        {!locked && (
          <div className="space-y-1.5">
            <Label htmlFor={`share-reason-${state.id}`}>{t("reason")}</Label>
            <Textarea
              id={`share-reason-${state.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
              placeholder={t("reasonPlaceholder")}
              aria-describedby={`share-reason-hint-${state.id}`}
              rows={3}
            />
            <p
              id={`share-reason-hint-${state.id}`}
              className="text-muted-foreground text-xs"
            >
              {t("reasonHint")}
            </p>
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}
