"use client";

import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LEVEL_STYLES } from "@/lib/announcements";
import { cn } from "@/lib/utils";
import type { Announcement } from "@/types/communication";
import {
  AnnouncementBody,
  AnnouncementCta,
  AnnouncementLevelIcon,
} from "./announcement-parts";

export type ModalAnnouncement = Pick<
  Announcement,
  | "title"
  | "body"
  | "level"
  | "cta_label"
  | "cta_url"
  | "dismissible"
  | "requires_acknowledgement"
>;

interface AnnouncementModalContentProps {
  announcement: ModalAnnouncement;
  /** "Entendi" / "Li e concordo". */
  onConfirm?: () => void;
  onNavigate?: () => void;
  pending?: boolean;
  /** Position in the queue, e.g. 1 of 3. */
  position?: { index: number; total: number };
  /** Heading element: `DialogTitle` in the host, plain `h2` in previews. */
  renderTitle?: (title: string, className: string) => React.ReactNode;
  className?: string;
}

/**
 * The inside of the announcement modal: level stripe and icon, title,
 * text, call to action and the confirm button. Rendered in a Dialog by
 * `AnnouncementModalHost`, and as-is by the staff editor's preview.
 */
export function AnnouncementModalContent({
  announcement,
  onConfirm,
  onNavigate,
  pending = false,
  position,
  renderTitle,
  className,
}: AnnouncementModalContentProps) {
  const t = useTranslations("announcements");
  const styles = LEVEL_STYLES[announcement.level] ?? LEVEL_STYLES.info;
  const titleClass =
    "text-lg leading-snug font-semibold tracking-tight text-balance";
  const title = announcement.title || t("untitled");

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full border",
            styles.surface,
            styles.border,
          )}
        >
          <AnnouncementLevelIcon
            level={announcement.level}
            className="size-5"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1 pt-0.5">
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs font-medium tracking-wide uppercase">
            <span>{t(`levels.${announcement.level}`)}</span>
            {position && position.total > 1 && (
              <span className="normal-case">
                {t("queue", { index: position.index, total: position.total })}
              </span>
            )}
          </p>
          {renderTitle ? (
            renderTitle(title, titleClass)
          ) : (
            <h2 className={titleClass}>{title}</h2>
          )}
        </div>
      </div>

      <div className="bg-muted/40 max-h-[50vh] overflow-y-auto rounded-lg border px-4 py-3">
        <AnnouncementBody body={announcement.body || t("emptyBody")} />
      </div>

      {announcement.requires_acknowledgement && (
        <p className="text-muted-foreground text-xs">{t("ackHint")}</p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <AnnouncementCta
          label={announcement.cta_label}
          url={announcement.cta_url}
          level={announcement.level}
          variant="outline"
          onNavigate={onNavigate}
        />
        <Button
          onClick={onConfirm}
          disabled={pending}
          className={cn(announcement.level === "critical" && styles.button)}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            announcement.requires_acknowledgement && (
              <Check className="h-4 w-4" aria-hidden />
            )
          )}
          {announcement.requires_acknowledgement
            ? t("acknowledge")
            : announcement.dismissible
              ? t("gotIt")
              : t("continue")}
        </Button>
      </div>
    </div>
  );
}
