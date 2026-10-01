"use client";

import { Fragment, useState, useTransition } from "react";
import {
  Ban,
  ChevronDown,
  LogOut,
  Power,
  PowerOff,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { describeApiError } from "@/lib/api-errors";
import { bulkTargets, groupBulkFailures } from "@/lib/console";
import { toast } from "@/lib/toast";
import type { User } from "@/types/api";
import type { BulkUserAction, BulkUserResult } from "@/types/operations";
import { bulkUpdateUsers } from "../actions";
import { BAN_DURATIONS, BAN_REASON_MAX } from "./ban-dialog";

const ACTIONS: { action: BulkUserAction; icon: LucideIcon }[] = [
  { action: "revoke_sessions", icon: LogOut },
  { action: "ban", icon: Ban },
  { action: "unban", icon: Undo2 },
  { action: "deactivate", icon: PowerOff },
  { action: "activate", icon: Power },
];

/** Usernames shown per failure reason before "and N more". */
const NAMES_SHOWN = 3;

/**
 * The bar shown while accounts are ticked in the list: how many, the
 * actions that apply to them (each confirmed first, a suspension with its
 * length and reason) and the outcome, with the accounts the API refused
 * and why.
 */
export function BulkActionsBar({
  selected,
  onClear,
}: {
  /** The ticked accounts (only ones the viewer may manage). */
  selected: User[];
  onClear: () => void;
}) {
  const t = useTranslations("console.bulk");
  const tBan = useTranslations("staff.ban");
  const tApi = useTranslations("apiErrors");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<BulkUserAction | null>(null);
  const [duration, setDuration] = useState("168");
  const [reason, setReason] = useState("");

  const targets = action ? bulkTargets(action, selected) : [];
  const skipped = selected.length - targets.length;

  const close = (open: boolean) => {
    if (open) return;
    setAction(null);
    setDuration("168");
    setReason("");
  };

  const describeFailure = (code: string) =>
    describeApiError(code, null, (key, values) => tApi(key, values), locale) ??
    tApi("rejected");

  const report = (current: BulkUserAction, result: BulkUserResult) => {
    const done = result.succeeded.length;
    if (result.failed.length === 0) {
      toast.success(t(`done.${current}`, { count: done }));
      return;
    }
    const names = new Map(selected.map((user) => [user.id, user.username]));
    const description = (
      <ul className="mt-1 space-y-1">
        {groupBulkFailures(result.failed).map(({ code, userIds }) => {
          const shown = userIds
            .slice(0, NAMES_SHOWN)
            .map((id) => `@${names.get(id) ?? id.slice(0, 8)}`)
            .join(", ");
          const more = userIds.length - NAMES_SHOWN;
          return (
            <li key={code}>
              <span className="font-medium">
                {more > 0
                  ? t("namesMore", { names: shown, count: more })
                  : shown}
              </span>
              : {describeFailure(code)}
            </li>
          );
        })}
      </ul>
    );
    const title =
      done === 0
        ? t("allFailed", { count: result.failed.length })
        : t("partial", { done, failed: result.failed.length });
    if (done === 0) toast.error(title, { description });
    else toast.warning(title, { description, duration: 10_000 });
  };

  const confirm = () => {
    if (!action || targets.length === 0) return;
    const current = action;
    const hours = Number(duration);
    startTransition(async () => {
      const result = await bulkUpdateUsers(
        current,
        targets,
        current === "ban"
          ? { durationHours: hours > 0 ? hours : null, reason }
          : undefined,
      );
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      if (result.data) report(current, result.data);
      close(false);
      onClear();
    });
  };

  if (selected.length === 0) return null;

  return (
    <>
      <div
        role="region"
        aria-label={t("label")}
        className="bg-card sticky bottom-4 z-20 flex flex-wrap items-center gap-2 rounded-xl border p-2 pl-4 shadow-lg"
      >
        <p className="text-sm font-medium" aria-live="polite">
          {t("selected", { count: selected.length })}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={isPending}>
                {t("actions")}
                <ChevronDown aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {ACTIONS.map(({ action: item, icon: Icon }, index) => {
                const count = bulkTargets(item, selected).length;
                return (
                  <Fragment key={item}>
                    {/* Sign-out and suspension first; status changes below. */}
                    {index === 3 && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      disabled={count === 0}
                      variant={item === "ban" ? "destructive" : "default"}
                      onSelect={() => setAction(item)}
                    >
                      <Icon aria-hidden />
                      <span className="flex-1">{t(`action.${item}`)}</span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {count}
                      </span>
                    </DropdownMenuItem>
                  </Fragment>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            disabled={isPending}
          >
            <X aria-hidden />
            <span className="sr-only sm:not-sr-only">{t("clear")}</span>
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={action !== null}
        onOpenChange={close}
        title={
          action ? t(`confirm.${action}.title`, { count: targets.length }) : ""
        }
        description={
          action ? (
            <>
              <p>{t(`confirm.${action}.description`)}</p>
              {skipped > 0 && (
                <p className="mt-2">
                  {t(`skipped.${action}`, { count: skipped })}
                </p>
              )}
            </>
          ) : undefined
        }
        confirmLabel={
          action ? t(`confirm.${action}.button`, { count: targets.length }) : ""
        }
        onConfirm={confirm}
        pending={isPending}
        destructive={action === "ban" || action === "deactivate"}
        confirmDisabled={targets.length === 0}
      >
        {action === "ban" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-ban-duration">{tBan("duration")}</Label>
              <Select
                value={duration}
                onValueChange={setDuration}
                disabled={isPending}
              >
                <SelectTrigger id="bulk-ban-duration" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BAN_DURATIONS.map((hours) => (
                    <SelectItem key={hours} value={String(hours)}>
                      {tBan(`durations.${hours}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-ban-reason">{tBan("reason")}</Label>
              <Textarea
                id="bulk-ban-reason"
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value.slice(0, BAN_REASON_MAX))
                }
                placeholder={tBan("reasonPlaceholder")}
                rows={3}
                disabled={isPending}
                aria-describedby="bulk-ban-reason-hint"
              />
              <p
                id="bulk-ban-reason-hint"
                className="text-muted-foreground text-xs"
              >
                {tBan("reasonHint")} · {reason.length}/{BAN_REASON_MAX}
              </p>
            </div>
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}
