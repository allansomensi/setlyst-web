"use client";

import { useTransition } from "react";
import { Setlist } from "@/types/api";
import { createSetlist, updateSetlist } from "../actions";
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

interface SetlistDialogProps {
  setlist?: Setlist | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SetlistDialog({
  setlist,
  isOpen,
  onClose,
}: SetlistDialogProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!setlist;

  const handleAction = (formData: FormData) => {
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateSetlist(setlist.id, data)
        : await createSetlist(data);

      if (result.success) {
        toast.success(isEditing ? "Setlist updated!" : "Setlist created!");
        onClose();
      } else {
        toast.error(result.error || "Failed to save setlist");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form action={handleAction} key={setlist?.id || "new"}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Setlist" : "Add New Setlist"}
            </DialogTitle>
            <DialogDescription>
              Enter the setlist details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={setlist?.title}
                required
                disabled={isPending}
                maxLength={255}
                placeholder="e.g., Summer Tour 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                name="description"
                defaultValue={setlist?.description || ""}
                disabled={isPending}
                placeholder="e.g., Main stage performance"
              />
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
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
