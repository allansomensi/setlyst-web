"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCheck, EyeOff, Loader2, Megaphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientDate } from "@/components/client-date";
import {
  AnnouncementBody,
  AnnouncementCta,
  AnnouncementLevelIcon,
} from "@/components/announcements/announcement-parts";
import {
  acknowledgeAnnouncement,
  markAnnouncementSeen,
} from "@/lib/actions/announcements";
import { toastActionError } from "@/lib/action-toast";
import { LEVEL_STYLES } from "@/lib/announcements";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { scrollIntoDashboard } from "@/lib/scroll-into-dashboard";
import type { UserAnnouncement } from "@/types/communication";

type Filter = "all" | "unread" | "pending";

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

function isPending(a: UserAnnouncement) {
  return (
    a.requires_acknowledgement &&
    !a.receipt.acknowledged_at &&
    a.status !== "ended"
  );
}

/**
 * The person's announcements, newest first, with their read state.
 * Opening the page marks what's listed as seen; announcements that ask
 * for it can be acknowledged here too.
 */
export function AnnouncementsHistory({
  announcements,
}: {
  announcements: UserAnnouncement[];
}) {
  const t = useTranslations("announcements");
  const [items, setItems] = useState(announcements);
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  // "Novo" stays on what was unread when the page opened.
  const [unreadAtOpen] = useState(
    () =>
      new Set(announcements.filter((a) => !a.receipt.seen_at).map((a) => a.id)),
  );
  const marked = useRef(false);

  useEffect(() => {
    if (marked.current) return;
    marked.current = true;
    for (const id of unreadAtOpen) {
      void markAnnouncementSeen(id).catch(() => undefined);
    }
  }, [unreadAtOpen]);

  // Deep links from the notification bell (#announcement-<id>).
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const target = document.getElementById(hash);
    if (target) scrollIntoDashboard(target);
  }, []);

  const counts = useMemo(
    () => ({
      all: items.length,
      unread: items.filter((a) => unreadAtOpen.has(a.id)).length,
      pending: items.filter(isPending).length,
    }),
    [items, unreadAtOpen],
  );

  const visible = items.filter((a) =>
    filter === "unread"
      ? unreadAtOpen.has(a.id)
      : filter === "pending"
        ? isPending(a)
        : true,
  );

  const acknowledge = async (a: UserAnnouncement) => {
    setPendingId(a.id);
    const result = await acknowledgeAnnouncement(a.id);
    setPendingId(null);
    if (!result.success) {
      toastActionError(result, result.error);
      return;
    }
    setItems((list) =>
      list.map((item) =>
        item.id === a.id
          ? {
              ...item,
              receipt: result.data ?? {
                ...item.receipt,
                acknowledged_at: new Date().toISOString(),
              },
            }
          : item,
      ),
    );
    toast.success(t("acknowledged"));
  };

  if (announcements.length === 0) {
    return (
      <div className="bg-card text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
        <Megaphone className="size-8 opacity-60" aria-hidden />
        <p className="font-medium">{t("emptyTitle")}</p>
        <p className="max-w-sm text-sm">{t("emptyDescription")}</p>
      </div>
    );
  }

  const filters: Filter[] = ["all", "unread", "pending"];

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label={t("filterLabel")}
        className="flex flex-wrap gap-2"
      >
        {filters.map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {t(`filters.${value}`)}
            <span
              className={cn(
                "rounded-full px-1.5 text-[11px] tabular-nums",
                filter === value ? "bg-primary-foreground/20" : "bg-muted",
              )}
            >
              {counts[value]}
            </span>
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-xl border border-dashed px-6 py-10 text-center text-sm">
          {t(`filterEmpty.${filter}`)}
        </p>
      ) : (
        <ol className="space-y-3">
          {visible.map((a) => {
            const styles = LEVEL_STYLES[a.level] ?? LEVEL_STYLES.info;
            const isNew = unreadAtOpen.has(a.id);
            return (
              <li
                key={a.id}
                id={`announcement-${a.id}`}
                className={cn(
                  "bg-card scroll-mt-4 rounded-xl border border-l-4 p-5 shadow-xs",
                  styles.border,
                )}
              >
                <article
                  className="space-y-3"
                  aria-labelledby={`announcement-title-${a.id}`}
                >
                  <header className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full",
                        styles.surface,
                      )}
                    >
                      <AnnouncementLevelIcon
                        level={a.level}
                        className="size-4"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2
                          id={`announcement-title-${a.id}`}
                          className="font-semibold break-words"
                        >
                          {a.title}
                        </h2>
                        {isNew && <Badge>{t("new")}</Badge>}
                        {a.status === "ended" && (
                          <Badge variant="secondary">{t("ended")}</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        <ClientDate
                          value={a.starts_at ?? a.published_at ?? a.created_at}
                          options={DATE_OPTIONS}
                        />
                        {a.ends_at && (
                          <>
                            {" · "}
                            {t("until")}{" "}
                            <ClientDate
                              value={a.ends_at}
                              options={DATE_OPTIONS}
                            />
                          </>
                        )}
                      </p>
                    </div>
                  </header>

                  <AnnouncementBody
                    body={a.body}
                    className="text-foreground/90"
                  />

                  <footer className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      {a.receipt.acknowledged_at ? (
                        <>
                          <CheckCheck
                            className="size-3.5 text-emerald-600"
                            aria-hidden
                          />
                          {t("acknowledgedOn")}{" "}
                          <ClientDate
                            value={a.receipt.acknowledged_at}
                            options={DATE_OPTIONS}
                          />
                        </>
                      ) : a.receipt.dismissed_at ? (
                        <>
                          <EyeOff className="size-3.5" aria-hidden />
                          {t("dismissedState")}
                        </>
                      ) : isPending(a) ? (
                        <span className="font-medium text-amber-700 dark:text-amber-300">
                          {t("pendingState")}
                        </span>
                      ) : null}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <AnnouncementCta
                        label={a.cta_label}
                        url={a.cta_url}
                        level={a.level}
                        size="sm"
                        variant="outline"
                      />
                      {isPending(a) && (
                        <Button
                          size="sm"
                          onClick={() => void acknowledge(a)}
                          disabled={pendingId === a.id}
                        >
                          {pendingId === a.id ? (
                            <Loader2 className="animate-spin" aria-hidden />
                          ) : (
                            <Check aria-hidden />
                          )}
                          {t("acknowledge")}
                        </Button>
                      )}
                    </div>
                  </footer>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
