"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  OctagonAlert,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import {
  isExternalCta,
  isValidCtaUrl,
  LEVEL_STYLES,
} from "@/lib/announcements";
import { cn } from "@/lib/utils";
import type { AnnouncementLevel } from "@/types/communication";

export const LEVEL_ICONS: Record<AnnouncementLevel, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  critical: OctagonAlert,
};

export function AnnouncementLevelIcon({
  level,
  className,
}: {
  level: AnnouncementLevel;
  className?: string;
}) {
  const Icon = LEVEL_ICONS[level] ?? Info;
  return (
    <Icon className={cn(LEVEL_STYLES[level]?.icon, className)} aria-hidden />
  );
}

/**
 * An announcement's text: plain text only (no HTML, no automatic links),
 * with the author's line breaks kept.
 */
export function AnnouncementBody({
  body,
  className,
}: {
  body: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-sm leading-relaxed break-words whitespace-pre-line",
        className,
      )}
    >
      {body}
    </p>
  );
}

/**
 * The call-to-action button. App paths go through the locale-aware
 * router; `https` links open in a new tab without handing this page to
 * the destination (`noopener noreferrer`). Anything else is not rendered.
 */
export function AnnouncementCta({
  label,
  url,
  level,
  onNavigate,
  size = "default",
  variant,
  className,
}: {
  label: string | null;
  url: string | null;
  level: AnnouncementLevel;
  onNavigate?: () => void;
  size?: "default" | "sm";
  variant?: "default" | "outline";
  className?: string;
}) {
  const t = useTranslations("announcements");
  if (!label || !url || !isValidCtaUrl(url)) return null;
  const tone =
    variant === "outline"
      ? undefined
      : LEVEL_STYLES[level]?.button || undefined;

  if (isExternalCta(url)) {
    return (
      <Button
        asChild
        size={size}
        variant={variant}
        className={cn(tone, className)}
      >
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
        >
          {label}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">{t("opensInNewTab")}</span>
        </a>
      </Button>
    );
  }

  return (
    <Button
      asChild
      size={size}
      variant={variant}
      className={cn(tone, className)}
    >
      <Link href={url} onClick={onNavigate}>
        {label}
      </Link>
    </Button>
  );
}
