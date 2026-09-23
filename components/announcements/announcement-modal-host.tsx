"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastActionError } from "@/lib/action-toast";
import type { UserAnnouncement } from "@/types/communication";
import {
  acknowledgeAnnouncement,
  dismissAnnouncement,
  getActiveAnnouncements,
  markAnnouncementSeen,
} from "@/lib/actions/announcements";
import { AnnouncementBanner } from "./announcement-banner";
import { AnnouncementModalContent } from "./announcement-modal";

/**
 * Session-only memory of non-dismissible modals the person already
 * went through ("Continuar"): they come back on the next visit, not on
 * every page of this one.
 */
const CONTINUED_KEY = "setlyst-announcements-continued";

function readContinued(): Set<string> {
  try {
    const raw = sessionStorage.getItem(CONTINUED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [],
    );
  } catch {
    return new Set();
  }
}

function rememberContinued(id: string) {
  try {
    const ids = readContinued();
    ids.add(id);
    sessionStorage.setItem(CONTINUED_KEY, JSON.stringify([...ids].slice(-50)));
  } catch {
    // Private mode or storage full: the modal simply shows again later.
  }
}

/**
 * Announcements on entering the dashboard: modal ones one at a time
 * (oldest first) and banners across the top of the content. Mounted once
 * in the dashboard layout, right above the page.
 */
export function AnnouncementModalHost() {
  const t = useTranslations("announcements");
  const [modals, setModals] = useState<UserAnnouncement[]>([]);
  const [banners, setBanners] = useState<UserAnnouncement[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [shownCount, setShownCount] = useState(0);
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    let cancelled = false;
    getActiveAnnouncements()
      .then((result) => {
        if (cancelled || !result.success || !result.data) return;
        const continued = readContinued();
        const queue = result.data.modal.filter(
          (a) =>
            a.dismissible || a.requires_acknowledgement || !continued.has(a.id),
        );
        setModals(queue);
        setShownCount(queue.length);
        setBanners(result.data.banner);
      })
      .catch(() => {
        // Best-effort: announcements are also listed on the Avisos page.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = modals[0] ?? null;

  const markSeen = useCallback((id: string) => {
    if (seenRef.current.has(id)) return;
    seenRef.current.add(id);
    void markAnnouncementSeen(id).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (current) markSeen(current.id);
  }, [current, markSeen]);

  useEffect(() => {
    for (const banner of banners) markSeen(banner.id);
  }, [banners, markSeen]);

  const next = (id: string) => {
    setModals((queue) => queue.filter((a) => a.id !== id));
  };

  const confirm = async (announcement: UserAnnouncement) => {
    if (!announcement.requires_acknowledgement && !announcement.dismissible) {
      rememberContinued(announcement.id);
      next(announcement.id);
      return;
    }
    setPendingId(announcement.id);
    const action = announcement.requires_acknowledgement
      ? acknowledgeAnnouncement
      : dismissAnnouncement;
    const result = await action(announcement.id);
    setPendingId(null);
    if (!result.success && result.code !== "read_only") {
      toastActionError(result, result.error);
      return;
    }
    next(announcement.id);
    // A dismissed or acknowledged announcement is done everywhere.
    setBanners((list) => list.filter((a) => a.id !== announcement.id));
  };

  const dismissBanner = async (announcement: UserAnnouncement) => {
    setPendingId(announcement.id);
    const result = await dismissAnnouncement(announcement.id);
    setPendingId(null);
    if (!result.success && result.code !== "read_only") {
      toastActionError(result, result.error);
      return;
    }
    setBanners((list) => list.filter((a) => a.id !== announcement.id));
  };

  const closable =
    current !== null &&
    current.dismissible &&
    !current.requires_acknowledgement;
  const index = shownCount - modals.length + 1;

  return (
    <>
      {banners.length > 0 && (
        <div aria-label={t("bannersLabel")} role="region">
          {banners.map((announcement) => (
            <AnnouncementBanner
              key={announcement.id}
              announcement={announcement}
              pending={pendingId === announcement.id}
              onDismiss={() => void dismissBanner(announcement)}
            />
          ))}
        </div>
      )}

      <Dialog
        open={current !== null}
        onOpenChange={(open) => {
          if (!open && current && closable && pendingId === null) {
            void confirm(current);
          }
        }}
      >
        {current && (
          <DialogContent
            showCloseButton={closable}
            className="sm:max-w-lg"
            onEscapeKeyDown={(event) => {
              if (!closable) event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (!closable) event.preventDefault();
            }}
            onInteractOutside={(event) => {
              if (!closable) event.preventDefault();
            }}
          >
            <DialogDescription className="sr-only">
              {t("modalDescription")}
            </DialogDescription>
            <AnnouncementModalContent
              key={current.id}
              announcement={current}
              pending={pendingId === current.id}
              position={{ index, total: shownCount }}
              onConfirm={() => void confirm(current)}
              renderTitle={(title, className) => (
                <DialogTitle className={className}>{title}</DialogTitle>
              )}
            />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
