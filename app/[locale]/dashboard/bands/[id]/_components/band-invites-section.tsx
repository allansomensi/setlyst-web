"use client";

import { useState, useTransition } from "react";
import { BandInvite, BandRole } from "@/types/api";
import { createBandInvite, revokeBandInvite } from "../../actions";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Copy, Link2, Loader2, Plus, X } from "lucide-react";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientDate } from "@/components/client-date";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { onFormSubmit } from "@/lib/forms";
import { copyText } from "@/lib/clipboard";
import { NativeSelect } from "@/components/ui/native-select";

const INVITE_ROLES: BandRole[] = ["member", "moderator", "admin"];
const EXPIRY_OPTIONS = [
  { hours: 24, key: "1d" },
  { hours: 24 * 7, key: "7d" },
  { hours: 24 * 30, key: "30d" },
  { hours: undefined, key: "never" },
] as const;

function inviteStatus(
  invite: BandInvite,
): "active" | "expired" | "revoked" | "exhausted" {
  if (invite.revoked_at) return "revoked";
  if (invite.expires_at && new Date(invite.expires_at) <= new Date())
    return "expired";
  if (invite.max_uses !== null && invite.uses_count >= invite.max_uses)
    return "exhausted";
  return "active";
}

interface BandInvitesSectionProps {
  bandId: string;
  invites: BandInvite[];
}

export function BandInvitesSection({
  bandId,
  invites,
}: BandInvitesSectionProps) {
  const t = useTranslations("bands.invites");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inviteToRevoke, setInviteToRevoke] = useState<BandInvite | null>(null);

  const handleCreate = (formData: FormData) => {
    const role = formData.get("role") as BandRole;
    const maxUsesRaw = formData.get("max_uses") as string;
    const expiresRaw = formData.get("expires_in_hours") as string;

    const max_uses = maxUsesRaw ? Number(maxUsesRaw) : undefined;
    const expires_in_hours =
      expiresRaw && expiresRaw !== "never" ? Number(expiresRaw) : undefined;

    startTransition(async () => {
      const result = await createBandInvite(bandId, {
        role,
        max_uses,
        expires_in_hours,
      });

      if (result.success) {
        setIsDialogOpen(false);
        // The next thing anyone does with a new invite is send it: the
        // link is one tap away (a tap, so the clipboard is allowed).
        const code = result.data?.code;
        toast.success(t("created"), {
          duration: 10_000,
          ...(code && {
            action: {
              label: t("copyLink"),
              onClick: () => void copyInviteLink(code),
            },
          }),
        });
      } else {
        toastActionError(result, result.error);
      }
    });
  };

  const confirmRevoke = () => {
    if (!inviteToRevoke) return;
    startTransition(async () => {
      const result = await revokeBandInvite(bandId, inviteToRevoke.id);
      if (result.success) {
        toast.success(t("revoked"));
        setInviteToRevoke(null);
      } else {
        // The dialog stays open so the person can retry or cancel.
        toastActionError(result, result.error);
      }
    });
  };

  const copyInviteLink = async (code: string) => {
    const url = `${window.location.origin}/dashboard/invite/${code}`;
    if (await copyText(url)) {
      toast.success(t("linkCopied"));
    } else {
      // Nothing was copied: show the link so it can be copied by hand.
      toast.info(t("copyLinkManually"), { description: url, duration: 15_000 });
    }
  };

  // Live invites first, newest first; spent ones after, dimmed.
  const sorted = [...invites].sort((a, b) => {
    const live = (invite: BandInvite) =>
      inviteStatus(invite) === "active" ? 0 : 1;
    return live(a) - live(b) || b.created_at.localeCompare(a.created_at);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="self-start">
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          {t("createInvite")}
        </Button>
      </div>

      {invites.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed">
          <EmptyState
            compact
            icon={Link2}
            title={t("empty")}
            description={t("emptyHint")}
          />
        </div>
      ) : (
        <div className="bg-card overflow-hidden rounded-xl border shadow-(--shadow-surface)">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.code")}</TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("table.role")}
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("table.uses")}
                </TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">{t("table.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((invite) => {
                const status = inviteStatus(invite);
                const active = status === "active";
                const uses = `${invite.uses_count}${
                  invite.max_uses !== null ? ` / ${invite.max_uses}` : ""
                }`;
                return (
                  <TableRow
                    key={invite.id}
                    className={cn(!active && "text-muted-foreground")}
                  >
                    <TableCell>
                      <span
                        className={cn(
                          "font-mono text-sm",
                          !active && "line-through decoration-1",
                        )}
                      >
                        {invite.code}
                      </span>
                      {/* On a phone the role and uses columns fold in
                          under the code. */}
                      <span className="text-muted-foreground block text-xs sm:hidden">
                        {t(`roles.${invite.role}`)} · {t("usesShort", { uses })}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {t(`roles.${invite.role}`)}
                    </TableCell>
                    <TableCell className="hidden tabular-nums sm:table-cell">
                      {uses}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          active
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {t(`status.${status}`)}
                      </Badge>
                      {active && invite.expires_at && (
                        <span className="text-muted-foreground mt-1 block text-xs">
                          {t.rich("expiresOn", {
                            date: () => (
                              <ClientDate
                                value={invite.expires_at}
                                options={{ day: "numeric", month: "short" }}
                              />
                            ),
                          })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* A spent invite has nothing left to do: copying
                          a dead link would only hand someone an error. */}
                      {active && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyInviteLink(invite.code)}
                            title={t("copyLink")}
                            aria-label={t("copyLinkFor", { code: invite.code })}
                          >
                            <Copy className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setInviteToRevoke(invite)}
                            disabled={isPending}
                            title={t("revoke")}
                            aria-label={t("revokeFor", { code: invite.code })}
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={onFormSubmit(handleCreate)}>
            <DialogHeader>
              <DialogTitle>{t("createInvite")}</DialogTitle>
              <DialogDescription>{t("createDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-role">{t("roleLabel")}</Label>
                <NativeSelect
                  id="invite-role"
                  name="role"
                  defaultValue="member"
                  disabled={isPending}
                >
                  {INVITE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {t(`roles.${role}`)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-expires">{t("expiresLabel")}</Label>
                <NativeSelect
                  id="invite-expires"
                  name="expires_in_hours"
                  defaultValue="168"
                  disabled={isPending}
                >
                  {EXPIRY_OPTIONS.map((option) => (
                    <option
                      key={option.key}
                      value={option.hours?.toString() ?? "never"}
                    >
                      {t(`expiresOptions.${option.key}`)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-max-uses">{t("maxUsesLabel")}</Label>
                <Input
                  id="invite-max-uses"
                  name="max_uses"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder={t("maxUsesPlaceholder")}
                  disabled={isPending}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isPending}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                )}
                {t("createInvite")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={!!inviteToRevoke}
        onOpenChange={(open) => !open && setInviteToRevoke(null)}
        title={t("revokeTitle")}
        description={t("revokeConfirm")}
        confirmLabel={t("revoke")}
        onConfirm={confirmRevoke}
        pending={isPending}
      />
    </div>
  );
}
