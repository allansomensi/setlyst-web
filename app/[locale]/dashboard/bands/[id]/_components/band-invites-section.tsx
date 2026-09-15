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
import { Copy, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

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

  const inputClass =
    "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50";

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
        toast.success(t("created"));
        setIsDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  const confirmRevoke = () => {
    if (!inviteToRevoke) return;
    startTransition(async () => {
      const result = await revokeBandInvite(bandId, inviteToRevoke.id);
      if (result.success) {
        toast.success(t("revoked"));
      } else {
        toast.error(result.error);
      }
      setInviteToRevoke(null);
    });
  };

  const copyInviteLink = (code: string) => {
    const url = `${window.location.origin}/dashboard/invite/${code}`;
    navigator.clipboard.writeText(url);
    toast.success(t("linkCopied"));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("createInvite")}
        </Button>
      </div>

      {invites.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <div className="bg-background rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.code")}</TableHead>
                <TableHead>{t("table.role")}</TableHead>
                <TableHead>{t("table.uses")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead className="text-right">
                  {t("table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => {
                const status = inviteStatus(invite);
                return (
                  <TableRow key={invite.id}>
                    <TableCell className="font-mono">{invite.code}</TableCell>
                    <TableCell className="capitalize">
                      {t(`roles.${invite.role}`)}
                    </TableCell>
                    <TableCell>
                      {invite.uses_count}
                      {invite.max_uses !== null ? ` / ${invite.max_uses}` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={status === "active" ? "outline" : "secondary"}
                        className="capitalize"
                      >
                        {t(`status.${status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyInviteLink(invite.code)}
                          title={t("copyLink")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {status === "active" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setInviteToRevoke(invite)}
                            disabled={isPending}
                            title={t("revoke")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
          <form action={handleCreate}>
            <DialogHeader>
              <DialogTitle>{t("createInvite")}</DialogTitle>
              <DialogDescription>{t("createDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="role">{t("roleLabel")}</Label>
                <select
                  id="role"
                  name="role"
                  className={inputClass}
                  defaultValue="member"
                  disabled={isPending}
                >
                  {INVITE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {t(`roles.${role}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires_in_hours">{t("expiresLabel")}</Label>
                <select
                  id="expires_in_hours"
                  name="expires_in_hours"
                  className={inputClass}
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
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_uses">{t("maxUsesLabel")}</Label>
                <Input
                  id="max_uses"
                  name="max_uses"
                  type="number"
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
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!inviteToRevoke}
        onOpenChange={(open) => !open && setInviteToRevoke(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("revoke")}</DialogTitle>
            <DialogDescription>{t("revokeConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setInviteToRevoke(null)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRevoke}
              disabled={isPending}
            >
              {t("revoke")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
