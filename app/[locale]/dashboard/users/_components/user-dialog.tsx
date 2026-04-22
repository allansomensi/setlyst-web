"use client";

import { useTransition } from "react";
import { User, UpdateUserPayload } from "@/types/api";
import { createUser, updateUser } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UserDialogProps {
  user?: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UserDialog({ user, isOpen, onClose }: UserDialogProps) {
  const t = useTranslations("users.dialog");
  const tRoles = useTranslations("users.roles");
  const tStatuses = useTranslations("users.statuses");
  const tCommon = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const isEditing = !!user;

  const handleAction = (formData: FormData) => {
    const emailValue = formData.get("email") as string;

    const data = {
      username: formData.get("username") as string,
      email: emailValue ? emailValue : null,
      first_name: (formData.get("first_name") as string) || null,
      last_name: (formData.get("last_name") as string) || null,
      role: formData.get("role") as User["role"],
      status: formData.get("status") as User["status"],
    };

    startTransition(async () => {
      let result;

      if (isEditing) {
        result = await updateUser(user.id, data as UpdateUserPayload);
      } else {
        const createData = {
          ...data,
          password: formData.get("password") as string,
        };
        result = await createUser(createData);
      }

      if (result.success) {
        toast.success(isEditing ? t("updated") : t("created"));
        onClose();
      } else {
        toast.error(
          result.error ?? (isEditing ? t("updateFailed") : t("createFailed")),
        );
      }
    });
  };

  const inputClass =
    "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-106.25">
        <form action={handleAction} key={user?.id ?? "new"}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t("editTitle") : t("addTitle")}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? t("editDescription") : t("addDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t("usernameLabel")}</Label>
                <Input
                  id="username"
                  name="username"
                  defaultValue={user?.username}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("emailLabel")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={user?.email || ""}
                  disabled={isPending}
                />
              </div>
            </div>

            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="password">{t("passwordLabel")}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={isPending}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">{t("firstNameLabel")}</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  defaultValue={user?.first_name || ""}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">{t("lastNameLabel")}</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  defaultValue={user?.last_name || ""}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">{t("roleLabel")}</Label>
                <select
                  id="role"
                  name="role"
                  className={`${inputClass} capitalize`}
                  defaultValue={user?.role || "user"}
                  disabled={isPending}
                  required
                >
                  <option value="user">{tRoles("user")}</option>
                  <option value="moderator">{tRoles("moderator")}</option>
                  <option value="admin">{tRoles("admin")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{t("statusLabel")}</Label>
                <select
                  id="status"
                  name="status"
                  className={`${inputClass} capitalize`}
                  defaultValue={user?.status || "active"}
                  disabled={isPending}
                  required
                >
                  <option value="active">{tStatuses("active")}</option>
                  <option value="inactive">{tStatuses("inactive")}</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? t("saveChanges") : t("createUser")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
