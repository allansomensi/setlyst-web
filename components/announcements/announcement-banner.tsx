"use client";

import { Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LEVEL_STYLES } from "@/lib/announcements";
import { cn } from "@/lib/utils";
import type { Announcement } from "@/types/communication";
import { AnnouncementCta, AnnouncementLevelIcon } from "./announcement-parts";

export type BannerAnnouncement = Pick<
  Announcement,
  | "title"
  | "body"
  | "level"
  | "cta_label"
  | "cta_url"
  | "dismissible"
  | "requires_acknowledgement"
>;

interface AnnouncementBannerProps {
  announcement: BannerAnnouncement;
  onDismiss?: () => void;
  pending?: boolean;
  className?: string;
}

/**
 * A strip across the top of the dashboard content. Shows the title and
 * the first line of the text; the full text is on the Avisos page.
 * Dismissible only when the announcement allows it.
 */
export function AnnouncementBanner({
  announcement,
  onDismiss,
  pending = false,
  className,
}: AnnouncementBannerProps) {
  const t = useTranslations("announcements");
  const styles = LEVEL_STYLES[announcement.level] ?? LEVEL_STYLES.info;
  const canDismiss =
    announcement.dismissible && !announcement.requires_acknowledgement;
  const firstLine =
    announcement.body.split(/\r?\n/).find((line) => line.trim()) ?? "";

  return (
    <div
      role={announcement.level === "critical" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 border-b px-4 py-2.5 text-sm md:px-8",
        styles.surface,
        styles.border,
        className,
      )}
    >
      <AnnouncementLevelIcon
        level={announcement.level}
        className="mt-0.5 size-4 shrink-0"
      />
      <div className="min-w-0 flex-1 gap-x-3 gap-y-1 sm:flex sm:items-center">
        <p className="min-w-0 flex-1">
          <span className="font-semibold">
            {announcement.title || t("untitled")}
          </span>
          {firstLine && (
            <span className="text-muted-foreground"> {firstLine}</span>
          )}
        </p>
        <AnnouncementCta
          label={announcement.cta_label}
          url={announcement.cta_url}
          level={announcement.level}
          size="sm"
          variant="outline"
          className="mt-2 h-7 shrink-0 bg-transparent sm:mt-0"
        />
      </div>
      {canDismiss && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="-my-0.5 shrink-0"
          onClick={onDismiss}
          disabled={pending}
          aria-label={t("dismissBanner")}
          title={t("dismissBanner")}
        >
          {pending ? <Loader2 className="animate-spin" /> : <X />}
        </Button>
      )}
    </div>
  );
}
