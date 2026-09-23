"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import type { AdminSetlistSummary } from "@/types/api";
import { deleteSetlistAsAdmin, updateSetlistAsAdmin } from "../../../actions";

const DESCRIPTION_MAX = 2000;

export function SetlistAdminActions({
  setlist,
}: {
  setlist: AdminSetlistSummary;
}) {
  const t = useTranslations("staff.setlistDetail");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState(setlist.title);
  const [description, setDescription] = useState(setlist.description ?? "");
  const [isPending, startTransition] = useTransition();

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateSetlistAsAdmin(setlist.id, {
        title: title.trim(),
        description: description.trim() || null,
      });
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("saved"));
      setEditing(false);
      router.refresh();
    });
  };

  const remove = () => {
    startTransition(async () => {
      const result = await deleteSetlistAsAdmin(setlist.id);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("deleted", { title: setlist.title }));
      router.push("/dashboard/admin/setlists");
    });
  };

  return (
    <div className="flex shrink-0 gap-2">
      <Button variant="outline" onClick={() => setEditing(true)}>
        <Pencil className="mr-2 h-4 w-4" />
        {tCommon("edit")}
      </Button>
      <Button
        variant="ghost"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setDeleting(true)}
        aria-label={t("delete")}
        title={t("delete")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog
        open={editing}
        onOpenChange={(open) => !isPending && setEditing(open)}
      >
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={save} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("editTitle")}</DialogTitle>
              <DialogDescription>{t("editDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="admin-setlist-title">{t("title")}</Label>
              <Input
                id="admin-setlist-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-setlist-description">
                {t("description")}
              </Label>
              <Textarea
                id="admin-setlist-description"
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value.slice(0, DESCRIPTION_MAX))
                }
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={isPending}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={!title.trim() || isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t("deleteTitle", { title: setlist.title })}
        description={t("deleteDescription")}
        confirmLabel={t("delete")}
        destructive
        pending={isPending}
        onConfirm={remove}
      />
    </div>
  );
}
