"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
import {
  Copy,
  Globe,
  Loader2,
  RefreshCw,
  Link2Off,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { toastActionError } from "@/lib/action-toast";
import { enableGigSharing, disableGigSharing } from "../../actions";
import { QrCodeDisplay } from "@/components/qr-code-display";

interface ShareGigDialogProps {
  gigId: string;
  shareToken: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareGigDialog({
  gigId,
  shareToken: initialShareToken,
  isOpen,
  onClose,
}: ShareGigDialogProps) {
  const t = useTranslations("gigs.share");
  const tCommon = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [isConfirmingDisable, setIsConfirmingDisable] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  const publicUrl =
    shareToken && typeof window !== "undefined"
      ? `${window.location.origin}/g/${shareToken}`
      : "";

  const handleEnable = () => {
    startTransition(async () => {
      const result = await enableGigSharing(gigId);
      if (result.success && result.data) {
        setShareToken(result.data.share_token);
        toast.success(t("enabled"));
      } else if (!result.success) {
        toastActionError(result, result.error);
      }
    });
  };

  const handleDisable = () => {
    startTransition(async () => {
      const result = await disableGigSharing(gigId);
      if (result.success) {
        setShareToken(null);
        toast.success(t("disabled"));
      } else {
        toastActionError(result, result.error);
      }
      setIsConfirmingDisable(false);
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success(t("linkCopied"));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {shareToken ? t("descriptionActive") : t("descriptionInactive")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {shareToken ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="share-link">{t("linkLabel")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-link"
                    readOnly
                    value={publicUrl}
                    onFocus={(e) => e.target.select()}
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyLink}
                    title={t("copyLink")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowQrCode((prev) => !prev)}
                    title={t("qrCode")}
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {showQrCode && (
                <QrCodeDisplay value={publicUrl} filename={`gig-${gigId}`} />
              )}

              {isConfirmingDisable ? (
                <div className="border-destructive/30 bg-destructive/5 space-y-3 rounded-lg border p-3">
                  <p className="text-sm">{t("disableConfirm")}</p>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsConfirmingDisable(false)}
                      disabled={isPending}
                    >
                      {tCommon("cancel")}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDisable}
                      disabled={isPending}
                    >
                      {isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {t("disableAction")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEnable}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {t("regenerateAction")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setIsConfirmingDisable(true)}
                    disabled={isPending}
                  >
                    <Link2Off className="mr-2 h-4 w-4" />
                    {t("disableAction")}
                  </Button>
                </div>
              )}

              <p className="text-muted-foreground text-xs">
                {t("regenerateHint")}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{t("enableHint")}</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          {!shareToken && (
            <Button type="button" onClick={handleEnable} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("enableAction")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
