"use client";

import { useState, useTransition } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { BandWithMembership, BandMember } from "@/types/api";
import { deleteBand, leaveBand, transferBandOwnership } from "../../actions";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { onFormSubmit } from "@/lib/forms";
import { NativeSelect } from "@/components/ui/native-select";

interface BandDangerZoneProps {
  band: BandWithMembership;
  members: BandMember[];
  currentUserId: string;
}

export function BandDangerZone({
  band,
  members,
  currentUserId,
}: BandDangerZoneProps) {
  const t = useTranslations("bands.danger");
  const tCommon = useTranslations("common");
  const router = useAppRouter();

  const [isPending, startTransition] = useTransition();
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [deleteName, setDeleteName] = useState("");

  const otherMembers = members.filter((m) => m.user_id !== currentUserId);

  const handleTransfer = (formData: FormData) => {
    const newOwnerId = formData.get("new_owner_id") as string;
    if (!newOwnerId) return;

    startTransition(async () => {
      const result = await transferBandOwnership(band.id, newOwnerId);
      if (result.success) {
        toast.success(t("transferred"));
        setIsTransferOpen(false);
      } else {
        toastActionError(result, result.error);
      }
    });
  };

  const confirmDelete = () => {
    startTransition(async () => {
      const result = await deleteBand(band.id);
      if (result.success) {
        toast.success(t("deleted"));
        router.push("/dashboard/bands");
      } else {
        // The dialog stays open so the person can retry or cancel.
        toastActionError(result, result.error);
      }
    });
  };

  const confirmLeave = () => {
    startTransition(async () => {
      const result = await leaveBand(band.id, currentUserId);
      if (result.success) {
        toast.success(t("left"));
        router.push("/dashboard/bands");
      } else {
        toastActionError(result, result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-destructive text-lg font-semibold">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <div className="bg-card border-destructive/30 divide-y overflow-hidden rounded-xl border shadow-(--shadow-surface)">
        {band.my_role === "owner" && otherMembers.length > 0 && (
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{t("transferTitle")}</p>
              <p className="text-muted-foreground text-sm">
                {t("transferDescription")}
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0 self-start sm:self-auto"
              onClick={() => setIsTransferOpen(true)}
            >
              {t("transferAction")}
            </Button>
          </div>
        )}

        {band.my_role !== "owner" && (
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{t("leaveTitle")}</p>
              <p className="text-muted-foreground text-sm">
                {t("leaveDescription")}
              </p>
            </div>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive shrink-0 self-start sm:self-auto"
              onClick={() => setIsLeaveOpen(true)}
            >
              {t("leaveAction")}
            </Button>
          </div>
        )}

        {band.my_role === "owner" && (
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{t("deleteTitle")}</p>
              <p className="text-muted-foreground text-sm">
                {t("deleteDescription")}
              </p>
            </div>
            <Button
              variant="destructive"
              className="shrink-0 self-start sm:self-auto"
              onClick={() => {
                setDeleteName("");
                setIsDeleteOpen(true);
              }}
            >
              {t("deleteAction")}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent>
          <form onSubmit={onFormSubmit(handleTransfer)}>
            <DialogHeader>
              <DialogTitle>{t("transferTitle")}</DialogTitle>
              <DialogDescription>{t("transferConfirm")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="new_owner_id">{t("newOwnerLabel")}</Label>
              <NativeSelect
                id="new_owner_id"
                name="new_owner_id"
                required
                disabled={isPending}
              >
                {otherMembers.map((member) => {
                  const name = [member.first_name, member.last_name]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <option key={member.user_id} value={member.user_id}>
                      {name
                        ? `${name} (@${member.username})`
                        : `@${member.username}`}
                    </option>
                  );
                })}
              </NativeSelect>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTransferOpen(false)}
                disabled={isPending}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                )}
                {t("transferAction")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={isLeaveOpen}
        onOpenChange={setIsLeaveOpen}
        title={t("leaveTitle")}
        description={t("leaveConfirm", { name: band.name })}
        confirmLabel={t("leaveAction")}
        onConfirm={confirmLeave}
        pending={isPending}
      />

      {/* Deleting a band takes every setlist, show and member with it,
          with no trash to come back from: typing the name makes sure it
          is this band and on purpose. */}
      <ConfirmActionDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: band.name })}
        confirmLabel={t("deleteAction")}
        onConfirm={confirmDelete}
        pending={isPending}
        confirmDisabled={deleteName.trim() !== band.name.trim()}
      >
        <div className="space-y-2">
          <Label htmlFor="delete-band-name">
            {t("typeToConfirm", { name: band.name })}
          </Label>
          <Input
            id="delete-band-name"
            value={deleteName}
            onChange={(e) => setDeleteName(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={isPending}
          />
        </div>
      </ConfirmActionDialog>
    </div>
  );
}
