"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/nav-link";
import { useUiSettings } from "@/components/providers/ui-settings-provider";
import { getLatestReleaseId } from "@/lib/actions/whats-new";
import { hasUnseenRelease } from "@/lib/release-note-editor";
import { cn } from "@/lib/utils";

/**
 * Latest published release id, shared by every WhatsNewLink on the page
 * (sidebar and mobile header) and fetched once per page load.
 */
let latestPromise: Promise<string | null> | null = null;
function loadLatest(): Promise<string | null> {
  latestPromise ??= getLatestReleaseId().catch(() => {
    latestPromise = null;
    return null;
  });
  return latestPromise;
}

/** Sparkles icon linking to the release notes, with a dot while unread. */
export function WhatsNewLink({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const { settings } = useUiSettings();
  const [latestId, setLatestId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadLatest().then((id) => {
      if (!cancelled) setLatestId(id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const unseen = hasUnseenRelease(latestId, settings.whatsNew.lastSeen);
  const label = unseen ? t("whatsNewUnread") : t("whatsNew");

  return (
    <Link
      href="/dashboard/whats-new"
      onClick={onNavigate}
      title={label}
      aria-label={label}
      className={cn(
        // size-10 on touch screens, like the Settings link next to it in
        // the mobile header; the focus ring the other header controls have.
        "hover:bg-muted focus-visible:ring-ring/50 relative flex size-9 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-3 pointer-coarse:size-10",
        unseen ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Sparkles className="h-4 w-4" aria-hidden />
      {unseen && (
        <span className="bg-primary ring-background absolute top-1.5 right-1.5 h-2 w-2 rounded-full ring-2" />
      )}
    </Link>
  );
}
