"use client";

import { useTransition } from "react";
import { Artist } from "@/types/api";
import { createArtist, updateArtist } from "../actions";
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

interface ArtistDialogProps {
  artist?: Artist | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ArtistDialog({ artist, isOpen, onClose }: ArtistDialogProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!artist;

  const handleAction = (formData: FormData) => {
    const name = formData.get("name") as string;

    startTransition(async () => {
      const result = isEditing
        ? await updateArtist(artist.id, { name })
        : await createArtist({ name });

      if (result.success) {
        toast.success(isEditing ? "Artist updated!" : "Artist created!");
        onClose();
      } else {
        toast.error(result.error || "Failed to save artist");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form action={handleAction} key={artist?.id || "new"}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Artist" : "Add New Artist"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update artist details."
                : "Enter details for the new artist."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Artist Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={artist?.name || ""}
                placeholder="e.g., John Mayer"
                required
                disabled={isPending}
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
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
