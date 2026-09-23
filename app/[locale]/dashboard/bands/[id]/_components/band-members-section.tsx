"use client";

import { useState, useTransition } from "react";
import {
  BandWithMembership,
  BandMember,
  BandRole,
  BAND_ROLE_LEVEL,
} from "@/types/api";
import {
  updateBandMemberRole,
  updateBandMemberTitle,
  removeBandMember,
  leaveBand,
} from "../../actions";
import { BandRoleBadge } from "@/components/bands/band-role-badge";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/components/nav-link";
import { LogOut, X, Pencil, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";

const ASSIGNABLE_ROLES: BandRole[] = ["member", "moderator", "admin"];

interface BandMembersSectionProps {
  band: BandWithMembership;
  members: BandMember[];
  currentUserId: string;
}

export function BandMembersSection({
  band,
  members,
  currentUserId,
}: BandMembersSectionProps) {
  const t = useTranslations("bands.members");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [memberToRemove, setMemberToRemove] = useState<BandMember | null>(null);
  const [memberToEditTitle, setMemberToEditTitle] = useState<BandMember | null>(
    null,
  );
  const [titleInput, setTitleInput] = useState("");

  const myLevel = BAND_ROLE_LEVEL[band.my_role];
  const canManage = band.my_role === "owner" || band.my_role === "admin";

  const handleRoleChange = (member: BandMember, role: BandRole) => {
    startTransition(async () => {
      const result = await updateBandMemberRole(band.id, member.user_id, role);
      if (result.success) {
        toast.success(t("roleUpdated"));
      } else {
        toastActionError(result, result.error);
      }
    });
  };

  const confirmRemove = () => {
    if (!memberToRemove) return;
    const isSelf = memberToRemove.user_id === currentUserId;

    startTransition(async () => {
      const result = isSelf
        ? await leaveBand(band.id, currentUserId)
        : await removeBandMember(band.id, memberToRemove.user_id);

      if (result.success) {
        toast.success(isSelf ? t("left") : t("removed"));
      } else {
        toastActionError(result, result.error);
      }
      setMemberToRemove(null);
    });
  };

  const openTitleEditor = (member: BandMember) => {
    setTitleInput(member.title ?? "");
    setMemberToEditTitle(member);
  };

  const confirmTitleEdit = () => {
    if (!memberToEditTitle) return;
    const title = titleInput.trim() || null;

    startTransition(async () => {
      const result = await updateBandMemberTitle(
        band.id,
        memberToEditTitle.user_id,
        title,
      );
      if (result.success) {
        toast.success(t("titleUpdated"));
        setMemberToEditTitle(null);
      } else {
        toastActionError(result, result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.member")}</TableHead>
              <TableHead>{t("table.role")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isSelf = member.user_id === currentUserId;
              const targetLevel = BAND_ROLE_LEVEL[member.role];
              const canEditThisMember =
                canManage && !isSelf && targetLevel < myLevel;
              const canRemoveThisMember =
                (canManage && !isSelf && targetLevel < myLevel) ||
                (isSelf && member.role !== "owner");

              const displayName =
                [member.first_name, member.last_name]
                  .filter(Boolean)
                  .join(" ") || member.username;

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="flex flex-wrap items-center gap-2 font-medium">
                        <Link
                          href={`/dashboard/profile/${member.user_id}`}
                          className="hover:underline"
                        >
                          {displayName}
                        </Link>
                        {isSelf && (
                          <span className="text-muted-foreground">
                            ({tCommon("you")})
                          </span>
                        )}
                        {member.title && (
                          <Badge variant="secondary" className="font-normal">
                            {member.title}
                          </Badge>
                        )}
                        {(isSelf || canManage) && (
                          <button
                            type="button"
                            onClick={() => openTitleEditor(member)}
                            className="text-muted-foreground hover:text-foreground"
                            title={t("editTitle")}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        @{member.username}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canEditThisMember ? (
                      <Select
                        value={member.role}
                        onValueChange={(role) =>
                          handleRoleChange(member, role as BandRole)
                        }
                        disabled={isPending}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_ROLES.filter(
                            (role) => BAND_ROLE_LEVEL[role] < myLevel,
                          ).map((role) => (
                            <SelectItem key={role} value={role}>
                              {t(`roles.${role}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <BandRoleBadge role={member.role} />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canRemoveThisMember && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setMemberToRemove(member)}
                        disabled={isPending}
                        title={isSelf ? t("leave") : t("remove")}
                      >
                        {isSelf ? (
                          <LogOut className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {memberToRemove?.user_id === currentUserId
                ? t("leaveTitle")
                : t("removeTitle")}
            </DialogTitle>
            <DialogDescription>
              {memberToRemove?.user_id === currentUserId
                ? t("leaveConfirm", { name: band.name })
                : t("removeConfirm", {
                    name: memberToRemove?.username ?? "",
                  })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setMemberToRemove(null)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemove}
              disabled={isPending}
            >
              {tCommon("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!memberToEditTitle}
        onOpenChange={(open) => !open && setMemberToEditTitle(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
            <DialogDescription>{t("editTitleDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="member-title">{t("titleLabel")}</Label>
            <Input
              id="member-title"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder={t("titlePlaceholder")}
              maxLength={50}
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setMemberToEditTitle(null)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button onClick={confirmTitleEdit} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
