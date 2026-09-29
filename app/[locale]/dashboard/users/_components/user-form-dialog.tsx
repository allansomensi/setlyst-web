"use client";

import { useState, useTransition } from "react";
import { Copy, Loader2, Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { UsernameHint } from "@/components/auth/username-hint";
import { toastActionError } from "@/lib/action-toast";
import {
  generateStrongPassword,
  isPasswordCompliant,
} from "@/lib/password-policy";
import { isValidUsername } from "@/lib/username-policy";
import { assignableRoles } from "@/lib/staff-permissions";
import type { User, UserRole, UserStatus } from "@/types/api";
import { createUser, updateUser } from "../actions";
import { copyText } from "@/lib/clipboard";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing when set; creating otherwise. */
  user?: User | null;
  actorRole: UserRole;
  onSaved?: (user: User) => void;
}

interface UserFormProps extends UserFormDialogProps {
  /** Tells the dialog a save is running, so it can't be dismissed. */
  onSavingChange: (saving: boolean) => void;
}

/**
 * Create or edit an account. Editing covers profile fields and status
 * only — role changes, suspensions and password resets each have their
 * own, explicit action.
 */
export function UserFormDialog(props: UserFormDialogProps) {
  // Esc / outside click are ignored mid-save: closing then would hide the
  // outcome (and unmount the form) while the request still lands.
  const [saving, setSaving] = useState(false);
  // Remount the form for each target so state never leaks between users.
  return (
    <Dialog
      open={props.open}
      onOpenChange={(next) => {
        if (!next && saving) return;
        props.onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {props.open && (
          <UserForm
            key={props.user?.id ?? "new"}
            {...props}
            onSavingChange={setSaving}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function UserForm({
  onOpenChange,
  user,
  actorRole,
  onSaved,
  onSavingChange,
}: UserFormProps) {
  const t = useTranslations("staff.userForm");
  const tRoles = useTranslations("roles");
  const tCommon = useTranslations("common");
  const tPolicy = useTranslations("passwordPolicy");
  const isEditing = Boolean(user);

  const [isPending, startTransition] = useTransition();
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [status, setStatus] = useState<UserStatus>(user?.status ?? "active");
  const [role, setRole] = useState<UserRole>("user");
  const [password, setPassword] = useState("");
  const [requireChange, setRequireChange] = useState(true);

  const roles = assignableRoles(actorRole);
  const usernameOk = isValidUsername(username.trim());
  const passwordOk = isEditing || isPasswordCompliant(password, username);
  const canSubmit = usernameOk && passwordOk && !isPending;

  const generate = () => {
    const next = generateStrongPassword();
    setPassword(next);
    void copyText(next).then((copied) => {
      if (copied) toast.success(tPolicy("copied"));
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    // Sent trimmed: a stray space pasted around an address or a name
    // would otherwise be stored (or fail validation) as typed.
    const trimmedEmail = email.trim();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    onSavingChange(true);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof createUser | typeof updateUser>>;
      try {
        result = isEditing
          ? await updateUser(user!.id, {
              username:
                username.trim() !== user!.username
                  ? username.trim()
                  : undefined,
              email:
                trimmedEmail !== (user!.email ?? "") ? trimmedEmail : undefined,
              first_name:
                trimmedFirst !== (user!.first_name ?? "")
                  ? trimmedFirst
                  : undefined,
              last_name:
                trimmedLast !== (user!.last_name ?? "")
                  ? trimmedLast
                  : undefined,
              status: status !== user!.status ? status : undefined,
            })
          : await createUser({
              username: username.trim(),
              password,
              email: trimmedEmail,
              first_name: trimmedFirst,
              last_name: trimmedLast,
              role,
              status,
              require_password_change: requireChange,
            });
      } finally {
        onSavingChange(false);
      }

      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(isEditing ? t("updated") : t("created"));
      if (result.data) onSaved?.(result.data);
      onOpenChange(false);
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>
          {isEditing ? t("editTitle") : t("createTitle")}
        </DialogTitle>
        <DialogDescription>
          {isEditing ? t("editDescription") : t("createDescription")}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="user-username">{t("username")}</Label>
        <Input
          id="user-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={20}
          aria-describedby="user-username-hint"
          aria-invalid={username.length > 0 && !usernameOk}
          required
        />
        <UsernameHint id="user-username-hint" username={username.trim()} />
      </div>

      {!isEditing && (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="user-password">{t("password")}</Label>
            <Button type="button" variant="ghost" size="sm" onClick={generate}>
              <Wand2 className="mr-1.5 h-3.5 w-3.5" />
              {tPolicy("generate")}
            </Button>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <PasswordInput
                id="user-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!password}
              aria-label={t("copyPassword")}
              title={t("copyPassword")}
              onClick={async () => {
                if (await copyText(password)) {
                  toast.success(tPolicy("copied"));
                } else {
                  toast.info(tCommon("copyManually"));
                }
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <PasswordRequirements password={password} username={username} />
          <label className="flex items-start justify-between gap-3 pt-1">
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">
                {t("requireChange")}
              </span>
              <span className="text-muted-foreground block text-xs">
                {t("requireChangeHint")}
              </span>
            </span>
            <Switch
              checked={requireChange}
              onCheckedChange={setRequireChange}
            />
          </label>
        </div>
      )}

      {/* Changing an existing account's e-mail is admin-only. */}
      {(!isEditing || actorRole === "admin") && (
        <div className="space-y-1.5">
          <Label htmlFor="user-email">
            {t("email")}{" "}
            <span className="text-muted-foreground font-normal">
              ({tCommon("optional")})
            </span>
          </Label>
          <Input
            id="user-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            maxLength={254}
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="user-first-name">{t("firstName")}</Label>
          <Input
            id="user-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="user-last-name">{t("lastName")}</Label>
          <Input
            id="user-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={50}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {!isEditing && (
          <div className="space-y-1.5">
            <Label htmlFor="user-form-role">{t("role")}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger id="user-form-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {tRoles(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="user-form-status">{t("status")}</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as UserStatus)}
          >
            <SelectTrigger id="user-form-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("statusActive")}</SelectItem>
              <SelectItem value="inactive">{t("statusInactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
        >
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? tCommon("save") : t("create")}
        </Button>
      </DialogFooter>
    </form>
  );
}
