"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BandWithMembership, BandMember } from "@/types/api";
import { deleteBand, leaveBand, transferBandOwnership } from "../../actions";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);

  const inputClass =
    "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50";

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
        toast.error(result.error);
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
        toast.error(result.error);
        setIsDeleteOpen(false);
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
        toast.error(result.error);
        setIsLeaveOpen(false);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-red-600">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <div className="divide-y rounded-md border border-red-200 dark:border-red-950">
        {band.my_role === "owner" && otherMembers.length > 0 && (
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{t("transferTitle")}</p>
              <p className="text-muted-foreground text-sm">
                {t("transferDescription")}
              </p>
            </div>
            <Button variant="outline" onClick={() => setIsTransferOpen(true)}>
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
            <Button variant="outline" onClick={() => setIsLeaveOpen(true)}>
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
            <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
              {t("deleteAction")}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent>
          <form action={handleTransfer}>
            <DialogHeader>
              <DialogTitle>{t("transferTitle")}</DialogTitle>
              <DialogDescription>{t("transferConfirm")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="new_owner_id">{t("newOwnerLabel")}</Label>
              <select
                id="new_owner_id"
                name="new_owner_id"
                className={inputClass}
                required
                disabled={isPending}
              >
                {otherMembers.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.username}
                  </option>
                ))}
              </select>
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
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("transferAction")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("leaveTitle")}</DialogTitle>
            <DialogDescription>
              {t("leaveConfirm", { name: band.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsLeaveOpen(false)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmLeave}
              disabled={isPending}
            >
              {t("leaveAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirm", { name: band.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {t("deleteAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
