"use client";

import { useState, useTransition } from "react";
import {
  AtSign,
  Bot,
  Eye,
  EyeOff,
  ExternalLink,
  Flag,
  ImageOff,
  Info,
  UserRound,
  UserRoundCog,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ClientDate } from "@/components/client-date";
import { Link } from "@/components/nav-link";
import { PlatformRoleBadge } from "@/components/role-badge";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import { proxiedImageSrc } from "@/lib/avatar";
import {
  actionsForFlag,
  canActOnFlag,
  isImageTarget,
  isKnownReason,
} from "@/lib/moderation";
import { toast } from "@/lib/toast";
import { MODERATION_CHANGED_EVENT } from "@/lib/moderation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/api";
import type { ModerationAction, ModerationFlag } from "@/types/staff";
import { resolveFlag } from "../actions";

const NOTE_MAX = 500;

const ACTION_ICONS: Record<ModerationAction, typeof X> = {
  dismiss: X,
  remove_avatar: ImageOff,
  remove_band_logo: ImageOff,
  reset_username: UserRoundCog,
};

function imageSrc(flag: ModerationFlag): string | null {
  if (!flag.current_value) return null;
  if (flag.target_type === "band_logo" && flag.band) {
    return proxiedImageSrc(
      `/api/images/band-logo/${encodeURIComponent(flag.band.id)}`,
      flag.current_value,
    );
  }
  if (flag.target_type === "avatar" || flag.target_type === "profile") {
    return flag.user.avatar_url
      ? proxiedImageSrc(
          `/api/images/avatar/${encodeURIComponent(flag.user.id)}`,
          flag.user.avatar_url,
        )
      : null;
  }
  return null;
}

/**
 * The flagged image, blurred until a staff member chooses to look: flagged
 * images may be explicit. Always the *current* image (through the image
 * proxy), which is what an action would remove.
 */
function FlaggedImage({ flag }: { flag: ModerationFlag }) {
  const t = useTranslations("moderation.card");
  const [revealed, setRevealed] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = imageSrc(flag);

  if (!src || failed) {
    return (
      <div className="bg-muted text-muted-foreground flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-lg border p-2 text-center text-xs">
        <ImageOff className="size-5" aria-hidden />
        {src ? t("imageUnavailable") : t("imageRemoved")}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={revealed ? t("imageAlt", { username: flag.user.username }) : ""}
          aria-hidden={!revealed}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={cn(
            "size-full object-cover transition-[filter,transform] duration-200",
            !revealed && "scale-125 blur-2xl saturate-50",
          )}
        />
        {!revealed && (
          <div className="bg-background/40 absolute inset-0 flex items-center justify-center">
            <EyeOff className="text-foreground/70 size-6" aria-hidden />
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="w-full"
        aria-pressed={revealed}
        onClick={() => setRevealed((v) => !v)}
      >
        {revealed ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        {revealed ? t("hideImage") : t("showImage")}
      </Button>
    </div>
  );
}

function ValueRow({
  label,
  value,
  mono,
  muted,
}: {
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        title={value}
        className={cn(
          "truncate text-sm",
          mono && "font-mono text-[13px]",
          muted && "text-muted-foreground italic",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function detailTerms(details: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const key of ["terms", "keywords", "domain"]) {
    const value = details?.[key];
    if (Array.isArray(value)) {
      out.push(...value.filter((v): v is string => typeof v === "string"));
    } else if (typeof value === "string") {
      out.push(value);
    }
  }
  return Array.from(new Set(out)).slice(0, 8);
}

export function FlagCard({
  flag,
  actor,
}: {
  flag: ModerationFlag;
  actor: { id: string; role: UserRole };
}) {
  const t = useTranslations("moderation");
  const router = useRouter();
  const [action, setAction] = useState<ModerationAction | null>(null);
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [pending, startTransition] = useTransition();

  const isOpen = flag.status === "open";
  const corrective = actionsForFlag(flag);
  const allowed = canActOnFlag(actor, flag);
  const changed = flag.current_value !== flag.value;
  const terms = detailTerms(flag.details);
  const isImage = isImageTarget(flag.target_type);
  const showImage =
    isImage || (flag.target_type === "profile" && flag.user.avatar_url);

  const openDialog = (next: ModerationAction) => {
    setNote("");
    setNotify(true);
    setAction(next);
  };

  const submit = () => {
    if (!action) return;
    startTransition(async () => {
      const result = await resolveFlag(flag.id, {
        action,
        note: note.trim() || null,
        notify_user: action !== "dismiss" && notify,
      });
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      setAction(null);
      toast.success(t(`resolved.${action}`));
      router.refresh();
      window.dispatchEvent(new Event(MODERATION_CHANGED_EVENT));
    });
  };

  const currentLabel = flag.current_value
    ? changed
      ? t("card.currentChanged")
      : t("card.currentSame")
    : t("card.currentRemoved");

  return (
    <Card className={cn("gap-0 py-0", !isOpen && "opacity-90")}>
      <CardContent className="grid gap-5 p-5 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <div className="w-32 max-w-full">
          {showImage ? (
            <FlaggedImage flag={flag} />
          ) : (
            <div className="bg-muted/60 flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border p-2">
              <UserAvatar
                userId={flag.user.id}
                name={flag.user.username}
                size="lg"
              />
              <AtSign className="text-muted-foreground size-4" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {t(`types.${flag.target_type}`)}
                </Badge>
                {!isOpen && (
                  <Badge variant="secondary">
                    {t(`statusLabels.${flag.status}`)}
                  </Badge>
                )}
                <span className="text-muted-foreground text-xs">
                  <ClientDate
                    value={flag.created_at}
                    options={{ dateStyle: "medium", timeStyle: "short" }}
                  />
                </span>
              </div>
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <Link
                  href={`/dashboard/users/${flag.user.id}`}
                  className="font-medium hover:underline"
                >
                  @{flag.user.username}
                </Link>
                <PlatformRoleBadge role={flag.user.role} />
                {flag.user.is_banned && (
                  <Badge variant="destructive">{t("card.banned")}</Badge>
                )}
                {flag.band && (
                  <span className="text-muted-foreground">
                    {t("card.band", { band: flag.band.name })}
                  </span>
                )}
              </p>
            </div>
            {flag.score !== null && (
              <div className="w-28 space-y-1 text-right">
                <p className="text-muted-foreground text-xs">
                  {t("card.score", { score: Math.round(flag.score * 100) })}
                </p>
                <div
                  className="bg-muted h-1.5 overflow-hidden rounded-full"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(flag.score * 100)}
                  aria-label={t("card.scoreLabel")}
                >
                  <div
                    className={cn(
                      "h-full rounded-full",
                      flag.score >= 0.8
                        ? "bg-red-500"
                        : flag.score >= 0.5
                          ? "bg-amber-500"
                          : "bg-sky-500",
                    )}
                    style={{ width: `${Math.round(flag.score * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <ValueRow
              label={t("card.flaggedValue")}
              value={flag.value}
              mono={flag.target_type !== "profile"}
            />
            <ValueRow
              label={currentLabel}
              value={flag.current_value ?? t("card.none")}
              mono={
                Boolean(flag.current_value) && flag.target_type !== "profile"
              }
              muted={!flag.current_value || !changed}
            />
          </dl>

          <div className="flex flex-wrap gap-1.5">
            {flag.reasons.map((reason) => (
              <Badge
                key={reason}
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
              >
                {isKnownReason(reason) ? t(`reasons.${reason}`) : reason}
              </Badge>
            ))}
            {terms.map((term) => (
              <Badge
                key={`term-${term}`}
                variant="secondary"
                className="font-mono"
              >
                {term}
              </Badge>
            ))}
          </div>

          <div className="text-muted-foreground flex items-start gap-2 text-sm">
            {flag.source === "report" ? (
              <Flag className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : (
              <Bot className="mt-0.5 size-4 shrink-0" aria-hidden />
            )}
            <div className="min-w-0 space-y-1">
              <p>
                {flag.source === "report"
                  ? t("card.reportedBy", {
                      username:
                        flag.reported_by_username ?? t("card.unknownUser"),
                    })
                  : t("card.automatic")}
              </p>
              {flag.report_note && (
                <blockquote className="border-l-2 pl-3 text-sm break-words whitespace-pre-line italic">
                  {flag.report_note}
                </blockquote>
              )}
            </div>
          </div>

          {!isOpen && (
            <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm">
              <p>
                {t("card.resolvedBy", {
                  resolution: flag.resolution
                    ? t.has(`resolutions.${flag.resolution}`)
                      ? t(`resolutions.${flag.resolution}`)
                      : flag.resolution
                    : "",
                  username: flag.resolved_by_username ?? t("card.unknownUser"),
                })}{" "}
                <ClientDate
                  value={flag.resolved_at}
                  className="text-muted-foreground"
                  options={{ dateStyle: "medium", timeStyle: "short" }}
                />
              </p>
              {flag.resolution_note && (
                <p className="text-muted-foreground mt-1 break-words whitespace-pre-line">
                  {flag.resolution_note}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            {isOpen && allowed && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDialog("dismiss")}
                >
                  <X aria-hidden />
                  {t("actions.dismiss")}
                </Button>
                {corrective.map((next) => {
                  const Icon = ACTION_ICONS[next];
                  return (
                    <Button
                      key={next}
                      variant="destructive"
                      size="sm"
                      onClick={() => openDialog(next)}
                      disabled={flag.user.id === actor.id}
                    >
                      <Icon aria-hidden />
                      {t(`actions.${next}`)}
                    </Button>
                  );
                })}
              </>
            )}
            <Button variant="ghost" size="sm" asChild className="ml-auto">
              <Link href={`/dashboard/users/${flag.user.id}`}>
                <UserRound aria-hidden />
                {t("actions.openUser")}
                <ExternalLink className="size-3" aria-hidden />
              </Link>
            </Button>
            {isOpen && !allowed && (
              <p className="text-muted-foreground w-full text-xs">
                {t("card.outranked")}
              </p>
            )}
          </div>
        </div>
      </CardContent>

      <ConfirmDialog
        open={action !== null}
        onOpenChange={(open) => !open && setAction(null)}
        title={action ? t(`confirm.${action}.title`) : ""}
        description={
          action
            ? t(`confirm.${action}.description`, {
                username: flag.user.username,
                band: flag.band?.name ?? "",
              })
            : undefined
        }
        confirmLabel={action ? t(`actions.${action}`) : ""}
        destructive={action !== null && action !== "dismiss"}
        pending={pending}
        onConfirm={submit}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={`note-${flag.id}`}>{t("dialog.note")}</Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {note.length}/{NOTE_MAX}
              </span>
            </div>
            <Textarea
              id={`note-${flag.id}`}
              value={note}
              maxLength={NOTE_MAX}
              rows={3}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("dialog.notePlaceholder")}
            />
            <p className="text-muted-foreground text-xs">
              {action !== "dismiss" && notify
                ? t("dialog.noteVisible")
                : t("dialog.noteInternal")}
            </p>
          </div>
          {action !== null && action !== "dismiss" && (
            <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
              <Label htmlFor={`notify-${flag.id}`} className="font-normal">
                {t("dialog.notify")}
              </Label>
              <Switch
                id={`notify-${flag.id}`}
                checked={notify}
                onCheckedChange={setNotify}
              />
            </div>
          )}
          {action === "reset_username" && (
            <p className="text-muted-foreground flex gap-2 text-xs">
              <Info className="size-3.5 shrink-0" aria-hidden />
              {t("dialog.resetHint")}
            </p>
          )}
        </div>
      </ConfirmDialog>
    </Card>
  );
}
