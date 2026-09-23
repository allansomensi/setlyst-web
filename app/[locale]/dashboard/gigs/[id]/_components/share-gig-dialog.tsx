"use client";

import { ShareDialog } from "@/components/share/share-dialog";
import { enableGigSharing, disableGigSharing } from "../../actions";

interface ShareGigDialogProps {
  gigId: string;
  shareToken: string | null;
  /** Set when staff took the public link down; sharing is blocked. */
  shareLock?: { reason: string | null } | null;
  isOpen: boolean;
  onClose: () => void;
}

/** Public link of a gig (`/g/{token}`). */
export function ShareGigDialog({ gigId, ...props }: ShareGigDialogProps) {
  return (
    <ShareDialog
      {...props}
      namespace="gigs.share"
      publicPathPrefix="/g"
      qrFilename={`gig-${gigId}`}
      onEnable={() => enableGigSharing(gigId)}
      onDisable={() => disableGigSharing(gigId)}
    />
  );
}
