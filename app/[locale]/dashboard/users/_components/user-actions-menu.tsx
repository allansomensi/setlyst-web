"use client";

import { useState, useTransition } from "react";
import {
  Ban,
  Eye,
  KeyRound,
  LogOut,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  ShieldCheck,
  ShieldHalf,
  ShieldOff,
  UserRound,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { useImpersonation } from "@/components/impersonation/use-impersonation";
import { Link } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import {
  canChangeRole,
  canManageUser,
  type StaffActor,
} from "@/lib/staff-permissions";
import type { User, UserRole } from "@/types/api";
import {
  revokeUserSessions,
  setUserRole,
  setUserStatus,
  unbanUser,
} from "../actions";
import { BanDialog } from "./ban-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { UserFormDialog } from "./user-form-dialog";

type PendingConfirm =
  | { kind: "role"; role: UserRole }
  | { kind: "deactivate" }
  | { kind: "activate" }
  | { kind: "unban" }
  | { kind: "sessions" }
  | { kind: "impersonate" };

const ROLE_ICONS: Record<UserRole, typeof ShieldCheck> = {
  admin: ShieldCheck,
  moderator: ShieldHalf,
  user: ShieldOff,
};

interface UserActionsMenuProps {
  user: User;
  actor: StaffActor;
  /** Show "Open details" (in the list; not on the detail page itself). */
  showDetailsLink?: boolean;
  /** Render as a labelled button instead of an icon (detail page header). */
  variant?: "icon" | "button";
}

/**
 * Every staff action on one account, in one menu. Items only appear when
 * the viewer may use them (see lib/staff-permissions.ts); each
 * consequential one asks for confirmation first. Deleting lives in the
 * danger zone of the detail page, not here.
 */
export function UserActionsMenu({
  user,
  actor,
  showDetailsLink = false,
  variant = "icon",
}: UserActionsMenuProps) {
  const t = useTranslations("staff.actions");
  const tRoles = useTranslations("roles");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const { start: startImpersonation, isSwitching } = useImpersonation();

  const [editing, setEditing] = useState(false);
  const [banning, setBanning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const manage = canManageUser(actor, user);
  const roleEditable = canChangeRole(actor, user);

  const run = (
    action: () => Promise<{ success: boolean } & Record<string, unknown>>,
    successMessage: string,
  ) => {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toastActionError(result, String(result.error ?? ""));
        return;
      }
      toast.success(successMessage);
      setPending(null);
    });
  };

  const confirmPending = () => {
    if (!pending) return;
    switch (pending.kind) {
      case "role":
        return run(
          () => setUserRole(user.id, pending.role),
          t("roleChanged", {
            username: user.username,
            role: tRoles(pending.role),
          }),
        );
      case "deactivate":
        return run(
          () => setUserStatus(user.id, "inactive"),
          t("deactivated", { username: user.username }),
        );
      case "activate":
        return run(
          () => setUserStatus(user.id, "active"),
          t("activated", { username: user.username }),
        );
      case "unban":
        return run(
          () => unbanUser(user.id),
          t("unbanned", { username: user.username }),
        );
      case "sessions":
        return run(
          () => revokeUserSessions(user.id),
          t("sessionsRevoked", { username: user.username }),
        );
      case "impersonate":
        setPending(null);
        void startImpersonation(user.id, user.username);
        return;
    }
  };

  const confirmCopy = (() => {
    if (!pending) return null;
    switch (pending.kind) {
      case "role":
        return {
          title: t("confirmRoleTitle", { role: tRoles(pending.role) }),
          description: t(`confirmRole.${pending.role}`, {
            username: user.username,
          }),
          confirm: t("confirmRoleButton"),
          destructive: false,
        };
      case "deactivate":
        return {
          title: t("confirmDeactivateTitle", { username: user.username }),
          description: t("confirmDeactivate"),
          confirm: t("deactivate"),
          destructive: true,
        };
      case "activate":
        return {
          title: t("confirmActivateTitle", { username: user.username }),
          description: t("confirmActivate"),
          confirm: t("activate"),
          destructive: false,
        };
      case "unban":
        return {
          title: t("confirmUnbanTitle", { username: user.username }),
          description: t("confirmUnban"),
          confirm: t("unban"),
          destructive: false,
        };
      case "sessions":
        return {
          title: t("confirmSessionsTitle", { username: user.username }),
          description: t("confirmSessions"),
          confirm: t("revokeSessions"),
          destructive: false,
        };
      case "impersonate":
        return {
          title: t("confirmImpersonateTitle", { username: user.username }),
          description: t("confirmImpersonate"),
          confirm: t("impersonate"),
          destructive: false,
        };
    }
  })();

  const hasManageItems = manage || roleEditable;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {variant === "icon" ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={tCommon("moreActions")}
              disabled={isPending || isSwitching}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" disabled={isPending || isSwitching}>
              <MoreHorizontal className="mr-2 h-4 w-4" />
              {t("menu")}
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="text-muted-foreground truncate text-xs font-normal">
            @{user.username}
          </DropdownMenuLabel>
          {showDetailsLink && (
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/users/${user.id}`}>
                <UserRound className="mr-2 h-4 w-4" />
                {t("openDetails")}
              </Link>
            </DropdownMenuItem>
          )}

          {manage && (
            <>
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setPending({ kind: "impersonate" })}
                disabled={user.status !== "active" || user.is_banned}
              >
                <Eye className="mr-2 h-4 w-4" />
                {t("impersonate")}
              </DropdownMenuItem>
            </>
          )}

          {roleEditable && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ShieldCheck className="mr-2 h-4 w-4" />
                {t("changeRole")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(["user", "moderator", "admin"] as const).map((role) => {
                  const Icon = ROLE_ICONS[role];
                  return (
                    <DropdownMenuItem
                      key={role}
                      disabled={role === user.role}
                      onSelect={() => setPending({ kind: "role", role })}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {tRoles(role)}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {manage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setResetting(true)}>
                <KeyRound className="mr-2 h-4 w-4" />
                {t("resetPassword")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setPending({ kind: "sessions" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("revokeSessions")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user.is_banned ? (
                <DropdownMenuItem
                  onSelect={() => setPending({ kind: "unban" })}
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  {t("unban")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setBanning(true)}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  {t("ban")}
                </DropdownMenuItem>
              )}
              {user.status === "active" ? (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setPending({ kind: "deactivate" })}
                >
                  <PowerOff className="mr-2 h-4 w-4" />
                  {t("deactivate")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={() => setPending({ kind: "activate" })}
                >
                  <Power className="mr-2 h-4 w-4" />
                  {t("activate")}
                </DropdownMenuItem>
              )}
            </>
          )}

          {!hasManageItems && (
            <DropdownMenuItem disabled className="text-xs whitespace-normal">
              {actor.id === user.id ? t("isYou") : t("outranked")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <UserFormDialog
        open={editing}
        onOpenChange={setEditing}
        user={user}
        actorRole={actor.role}
      />
      <BanDialog user={banning ? user : null} onOpenChange={setBanning} />
      <ResetPasswordDialog
        user={resetting ? user : null}
        onOpenChange={setResetting}
      />
      {confirmCopy && (
        <ConfirmDialog
          open={Boolean(pending)}
          onOpenChange={(open) => !open && setPending(null)}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirm}
          destructive={confirmCopy.destructive}
          onConfirm={confirmPending}
          pending={isPending}
        />
      )}
    </>
  );
}
