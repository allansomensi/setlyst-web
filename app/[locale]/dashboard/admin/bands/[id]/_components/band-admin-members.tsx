"use client";

import { useCallback, useState, useTransition } from "react";
import { Crown, MoreHorizontal, Plus, UserMinus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { BandRoleBadge } from "@/components/bands/band-role-badge";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import {
  EntityPicker,
  type PickerOption,
} from "@/components/staff/entity-picker";
import { Link } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import { formatApiDate } from "@/lib/dates";
import type { BandMember, BandRole } from "@/types/api";
import {
  addBandMemberAsAdmin,
  removeBandMemberAsAdmin,
  searchUsers,
  setBandMemberRoleAsAdmin,
  transferBandOwnershipAsAdmin,
} from "../../../actions";

type AssignableRole = Exclude<BandRole, "owner">;
const ASSIGNABLE: AssignableRole[] = ["member", "moderator", "admin"];

type Pending =
  | { kind: "role"; member: BandMember; role: AssignableRole }
  | { kind: "remove"; member: BandMember }
  | { kind: "transfer"; member: BandMember };

export function BandAdminMembers({
  bandId,
  members,
  canEdit,
}: {
  bandId: string;
  members: BandMember[];
  canEdit: boolean;
}) {
  const t = useTranslations("staff.bandMembers");
  const tRoles = useTranslations("bands.roles");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [pending, setPending] = useState<Pending | null>(null);
  const [adding, setAdding] = useState(false);
  const [candidate, setCandidate] = useState<PickerOption | null>(null);
  const [newRole, setNewRole] = useState<AssignableRole>("member");

  const memberIds = new Set(members.map((m) => m.user_id));

  const search = useCallback(
    async (query: string): Promise<PickerOption[]> => {
      const result = await searchUsers(query);
      if (!result.success) return [];
      return (result.data ?? []).map((user) => ({
        id: user.id,
        label: `@${user.username}`,
        hint:
          [user.first_name, user.last_name].filter(Boolean).join(" ") ||
          undefined,
        disabled:
          memberIds.has(user.id) || user.status !== "active" || user.is_banned,
        disabledReason: memberIds.has(user.id)
          ? t("alreadyMember")
          : t("unavailable"),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members],
  );

  const act = (
    action: () => Promise<{ success: boolean; error?: string }>,
    message: string,
    after?: () => void,
  ) => {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toastActionError(result, result.error ?? "");
        return;
      }
      toast.success(message);
      setPending(null);
      after?.();
    });
  };

  const confirm = () => {
    if (!pending) return;
    const name = `@${pending.member.username}`;
    if (pending.kind === "role") {
      act(
        () =>
          setBandMemberRoleAsAdmin(
            bandId,
            pending.member.user_id,
            pending.role,
          ),
        t("roleChanged", { username: name, role: tRoles(pending.role) }),
      );
    } else if (pending.kind === "remove") {
      act(
        () => removeBandMemberAsAdmin(bandId, pending.member.user_id),
        t("removed", { username: name }),
      );
    } else {
      act(
        () => transferBandOwnershipAsAdmin(bandId, pending.member.user_id),
        t("transferred", { username: name }),
      );
    }
  };

  const add = () => {
    if (!candidate) return;
    act(
      () => addBandMemberAsAdmin(bandId, candidate.id, newRole),
      t("added", { username: candidate.label }),
      () => {
        setAdding(false);
        setCandidate(null);
        setNewRole("member");
      },
    );
  };

  const copy = pending
    ? pending.kind === "role"
      ? {
          title: t("confirmRoleTitle", {
            username: `@${pending.member.username}`,
          }),
          description: t("confirmRole", { role: tRoles(pending.role) }),
          confirm: t("changeRole"),
          destructive: false,
        }
      : pending.kind === "remove"
        ? {
            title: t("confirmRemoveTitle", {
              username: `@${pending.member.username}`,
            }),
            description: t("confirmRemove"),
            confirm: t("remove"),
            destructive: true,
          }
        : {
            title: t("confirmTransferTitle", {
              username: `@${pending.member.username}`,
            }),
            description: t("confirmTransfer"),
            confirm: t("transfer"),
            destructive: false,
          }
    : null;

  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-md border">
        {members.map((member) => {
          const fullName = [member.first_name, member.last_name]
            .filter(Boolean)
            .join(" ");
          const isOwner = member.role === "owner";
          return (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <Link
                  href={`/dashboard/users/${member.user_id}`}
                  className="block truncate font-medium hover:underline"
                >
                  @{member.username}
                </Link>
                <span className="text-muted-foreground block truncate text-xs">
                  {[
                    fullName,
                    member.title,
                    t("joined", {
                      date: formatApiDate(member.joined_at, locale),
                    }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <BandRoleBadge role={member.role} />
                {canEdit && !isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={tCommon("moreActions")}
                        disabled={isPending}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                        {t("changeRole")}
                      </DropdownMenuLabel>
                      {ASSIGNABLE.map((role) => (
                        <DropdownMenuItem
                          key={role}
                          disabled={role === member.role}
                          onSelect={() =>
                            setPending({ kind: "role", member, role })
                          }
                        >
                          {tRoles(role)}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() =>
                          setPending({ kind: "transfer", member })
                        }
                      >
                        <Crown className="mr-2 h-4 w-4" />
                        {t("transfer")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setPending({ kind: "remove", member })}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        {t("remove")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {canEdit && (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("add")}
        </Button>
      )}

      {copy && (
        <ConfirmDialog
          open={Boolean(pending)}
          onOpenChange={(open) => !open && setPending(null)}
          title={copy.title}
          description={copy.description}
          confirmLabel={copy.confirm}
          destructive={copy.destructive}
          onConfirm={confirm}
          pending={isPending}
        />
      )}

      <ConfirmDialog
        open={adding}
        onOpenChange={(open) => {
          setAdding(open);
          if (!open) setCandidate(null);
        }}
        title={t("addTitle")}
        description={t("addDescription")}
        confirmLabel={t("add")}
        onConfirm={add}
        pending={isPending}
        confirmDisabled={!candidate}
      >
        <div className="space-y-4">
          {adding && (
            <EntityPicker
              search={search}
              value={candidate?.id ?? null}
              onChange={setCandidate}
              placeholder={t("searchUsers")}
              autoFocus
            />
          )}
          <div className="space-y-1.5">
            <Label>{t("role")}</Label>
            <Select
              value={newRole}
              onValueChange={(v) => setNewRole(v as AssignableRole)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE.map((role) => (
                  <SelectItem key={role} value={role}>
                    {tRoles(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
