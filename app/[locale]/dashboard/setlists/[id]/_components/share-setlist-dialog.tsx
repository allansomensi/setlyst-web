"use client";

import { ShareDialog } from "@/components/share/share-dialog";
import { enableSetlistSharing, disableSetlistSharing } from "../../actions";

interface ShareSetlistDialogProps {
  setlistId: string;
  shareToken: string | null;
  /** Set when staff took the public link down; sharing is blocked. */
  shareLock?: { reason: string | null } | null;
  isOpen: boolean;
  onClose: () => void;
}

/** Public link of a setlist (`/s/{token}`). */
export function ShareSetlistDialog({
  setlistId,
  ...props
}: ShareSetlistDialogProps) {
  return (
    <ShareDialog
      {...props}
      namespace="setlists.share"
      publicPathPrefix="/s"
      qrFilename={`setlist-${setlistId}`}
      onEnable={() => enableSetlistSharing(setlistId)}
      onDisable={() => disableSetlistSharing(setlistId)}
    />
  );
}
