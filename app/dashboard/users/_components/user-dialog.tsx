"use client";

import { useTransition } from "react";
import { User, UpdateUserPayload } from "@/types/api";
import { updateUser } from "../actions";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UserDialogProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UserDialog({ user, isOpen, onClose }: UserDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleAction = (formData: FormData) => {
    if (!user) return;

    const data: UpdateUserPayload = {
      username: formData.get("username") as string,
      first_name: (formData.get("first_name") as string) || null,
      last_name: (formData.get("last_name") as string) || null,
      role: formData.get("role") as User["role"],
      status: formData.get("status") as User["status"],
    };

    startTransition(async () => {
      const result = await updateUser(user.id, data);

      if (result.success) {
        toast.success("User updated successfully!");
        onClose();
      } else {
        toast.error(result.error ?? "Error updating user");
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
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user permissions and profile details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                defaultValue={user?.username}
                required
                disabled={isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  defaultValue={user?.first_name || ""}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
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
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  className={inputClass}
                  defaultValue={user?.role}
                  disabled={isPending}
                  required
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  className={inputClass}
                  defaultValue={user?.status}
                  disabled={isPending}
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
