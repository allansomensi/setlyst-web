"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { toastActionError } from "@/lib/action-toast";
import type { User } from "@/types/api";
import { banUser } from "../actions";

/** Preset suspension lengths, in hours. `0` means permanent. */
const DURATIONS = [1, 24, 72, 168, 720, 2160, 0] as const;
const REASON_MAX = 500;

interface BanDialogProps {
  user: Pick<User, "id" | "username"> | null;
  onOpenChange: (open: boolean) => void;
  onDone?: (user: User) => void;
}

/**
 * Suspends an account for a fixed time (or permanently). The person is
 * signed out everywhere immediately and sees the end date and reason when
 * trying to sign in. Nothing is deleted.
 */
export function BanDialog({ user, onOpenChange, onDone }: BanDialogProps) {
  const t = useTranslations("staff.ban");
  const [isPending, startTransition] = useTransition();
  const [duration, setDuration] = useState<string>("168");
  const [reason, setReason] = useState("");

  const close = (open: boolean) => {
    if (!open) {
      setDuration("168");
      setReason("");
    }
    onOpenChange(open);
  };

  const confirm = () => {
    if (!user) return;
    const hours = Number(duration);
    startTransition(async () => {
      const result = await banUser(user.id, hours > 0 ? hours : null, reason);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("done", { username: user.username }));
      if (result.data) onDone?.(result.data);
      close(false);
    });
  };

  return (
    <ConfirmDialog
      open={Boolean(user)}
      onOpenChange={close}
      title={t("title", { username: user?.username ?? "" })}
      description={t("description")}
      confirmLabel={t("confirm")}
      onConfirm={confirm}
      pending={isPending}
      destructive
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("duration")}</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((hours) => (
                <SelectItem key={hours} value={String(hours)}>
                  {t(`durations.${hours}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ban-reason">{t("reason")}</Label>
          <Textarea
            id="ban-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
            placeholder={t("reasonPlaceholder")}
            rows={3}
          />
          <p className="text-muted-foreground text-xs">
            {t("reasonHint")} · {reason.length}/{REASON_MAX}
          </p>
        </div>
      </div>
    </ConfirmDialog>
  );
}
