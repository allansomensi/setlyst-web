"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Copy,
  Globe,
  Link2Off,
  Loader2,
  QrCode,
  RefreshCw,
} from "lucide-react";
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
import { QrCodeDisplay } from "@/components/qr-code-display";
import { ShareLockedNotice } from "@/components/share-locked-notice";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { copyText } from "@/lib/clipboard";
import type { ActionResult } from "@/lib/action-guard";

export interface ShareDialogProps {
  /**
   * Translation namespace with the dialog's texts (`title`,
   * `descriptionActive`, `enableAction`, ...), e.g. "setlists.share".
   */
  namespace: "setlists.share" | "gigs.share";
  /** Public path prefix of the shared page: "/s" (setlists) or "/g" (gigs). */
  publicPathPrefix: "/s" | "/g";
  /** Base name of the downloaded QR code image. */
  qrFilename: string;
  shareToken: string | null;
  /** Set when staff took the public link down; sharing is blocked. */
  shareLock?: { reason: string | null } | null;
  /** Creates (or regenerates) the link; resolves with the new token. */
  onEnable: () => Promise<ActionResult<{ share_token: string | null }>>;
  onDisable: () => Promise<ActionResult<void>>;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Public link management shared by setlists and gigs: create, copy (with
 * a fallback when the clipboard is unavailable), show as QR code,
 * regenerate and turn off.
 */
export function ShareDialog({
  namespace,
  publicPathPrefix,
  qrFilename,
  shareToken: initialShareToken,
  shareLock,
  onEnable,
  onDisable,
  isOpen,
  onClose,
}: ShareDialogProps) {
  const t = useTranslations(namespace);
  const tCommon = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [isConfirmingDisable, setIsConfirmingDisable] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const publicUrl =
    shareToken && typeof window !== "undefined"
      ? `${window.location.origin}${publicPathPrefix}/${shareToken}`
      : "";

  const handleEnable = () => {
    startTransition(async () => {
      const result = await onEnable();
      if (result.success && result.data?.share_token) {
        setShareToken(result.data.share_token);
        toast.success(t("enabled"));
      } else if (!result.success) {
        toastActionError(result, result.error);
      }
    });
  };

  const handleDisable = () => {
    startTransition(async () => {
      const result = await onDisable();
      if (result.success) {
        setShareToken(null);
        toast.success(t("disabled"));
      } else {
        toastActionError(result, result.error);
      }
      setIsConfirmingDisable(false);
    });
  };

  const copyLink = async () => {
    if (await copyText(publicUrl)) {
      toast.success(t("linkCopied"));
      return;
    }
    // Nothing reached the clipboard: select the link for a manual copy.
    linkInputRef.current?.focus();
    linkInputRef.current?.select();
    toast.info(tCommon("copyManually"));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" aria-hidden />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {shareToken ? t("descriptionActive") : t("descriptionInactive")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {shareLock ? (
            <ShareLockedNotice reason={shareLock.reason} />
          ) : shareToken ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="share-link">{t("linkLabel")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-link"
                    ref={linkInputRef}
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
                    <Copy className="h-4 w-4" aria-hidden />
                    <span className="sr-only">{t("copyLink")}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowQrCode((prev) => !prev)}
                    title={t("qrCode")}
                    aria-pressed={showQrCode}
                  >
                    <QrCode className="h-4 w-4" aria-hidden />
                    <span className="sr-only">{t("qrCode")}</span>
                  </Button>
                </div>
              </div>

              {showQrCode && (
                <QrCodeDisplay value={publicUrl} filename={qrFilename} />
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
                        <Loader2
                          className="mr-2 h-4 w-4 animate-spin"
                          aria-hidden
                        />
                      )}
                      {t("disableAction")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEnable}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden
                      />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
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
                    <Link2Off className="mr-2 h-4 w-4" aria-hidden />
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
            {tCommon("close")}
          </Button>
          {!shareToken && !shareLock && (
            <Button type="button" onClick={handleEnable} disabled={isPending}>
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              {t("enableAction")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
