"use client";

import { useRef, useState, type DragEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileJson, ListMusic, Loader2, UploadCloud } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppRouter } from "@/hooks/use-app-router";
import { toastActionError } from "@/lib/action-toast";
import { describeApiError } from "@/lib/api-errors";
import { cn } from "@/lib/utils";
import type { ImportBackupResponse } from "@/types/api";
import { readSetlistFile, type SetlistFileSummary } from "@/lib/setlist-file";

/** Same ceiling as lib/server/json-upload.ts (and the API). */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** What the chosen file holds, read before anything is sent. */
interface Preview extends SetlistFileSummary {
  name: string;
  text: string;
}

/**
 * "Import setlist": a file someone exported from their setlist becomes a
 * setlist of this account, with the songs and artists it carries (reused
 * when the account already has them). Opens the new setlist when done.
 */
export function ImportSetlistDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("setlists.importSetlist");
  const tCommon = useTranslations("common");
  const tApi = useTranslations("apiErrors");
  const locale = useLocale();
  const router = useAppRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);

  const close = (value: boolean) => {
    if (importing) return;
    if (!value) setPreview(null);
    onOpenChange(value);
  };

  const choose = async (file: File) => {
    if (inputRef.current) inputRef.current.value = "";
    if (file.size > MAX_FILE_BYTES) {
      toast.error(t("tooLarge", { size: 10 }));
      return;
    }
    const text = await file.text();
    const reading = readSetlistFile(text);
    if (!reading.ok) {
      toast.error(reading.reason === "backup" ? t("isBackup") : t("invalid"));
      return;
    }
    setPreview({ name: file.name, text, ...reading.summary });
  };

  const onDrag = (event: DragEvent<HTMLButtonElement>, over: boolean) => {
    event.preventDefault();
    setDragging(over && !importing);
  };

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && !importing) void choose(file);
  };

  const runImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      let response: Response;
      try {
        response = await fetch("/api/import/setlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: preview.text,
          credentials: "same-origin",
        });
      } catch {
        toast.error(t("failed"));
        return;
      }

      if (!response.ok) {
        let body: {
          code?: string;
          message?: string;
          meta?: Record<string, unknown>;
        } = {};
        try {
          body = await response.json();
        } catch {
          // Not JSON.
        }
        if (response.status === 401) {
          toastActionError(
            { code: "session_revoked" },
            tApi("SESSION_REVOKED"),
          );
          return;
        }
        if (response.status === 413) {
          toast.error(t("tooLarge", { size: 10 }));
          return;
        }
        // Through toastActionError so EMAIL_NOT_VERIFIED and QUOTA_EXCEEDED
        // get their actions, and a busy server a warning with the wait.
        const retry = body.meta?.retry_after_seconds;
        toastActionError(
          {
            apiCode: body.code,
            code:
              body.code === "TOO_MANY_ATTEMPTS" || body.code === "SERVICE_BUSY"
                ? "rate_limited"
                : undefined,
            retryAfterSeconds: typeof retry === "number" ? retry : undefined,
          },
          describeApiError(
            body.code,
            body.meta,
            (key, values) => tApi(key, values),
            locale,
          ) ?? t("failed"),
        );
        return;
      }

      const result = (await response.json()) as ImportBackupResponse;
      toast.success(t("success", { title: preview.title }));
      setPreview(null);
      onOpenChange(false);
      const created = result.setlist_ids?.[0];
      if (created) router.push(`/dashboard/setlists/${created}`);
      else router.refresh();
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent showCloseButton={!importing} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void choose(file);
          }}
        />

        {preview ? (
          <div className="space-y-3">
            <div className="bg-muted/40 flex items-start gap-3 rounded-lg border p-3">
              <span className="bg-primary/10 text-primary shrink-0 rounded-md p-2">
                <ListMusic className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{preview.title}</p>
                <p className="text-muted-foreground text-sm">
                  {[
                    t("songs", { count: preview.songs }),
                    t("artists", { count: preview.artists }),
                    preview.markers > 0 &&
                      t("blocks", { count: preview.markers }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="text-muted-foreground mt-1 flex items-center gap-1.5 truncate text-xs">
                  <FileJson className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{preview.name}</span>
                </p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">{t("merge")}</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={importing}
              className="text-primary text-sm font-medium underline-offset-4 hover:underline disabled:opacity-50"
            >
              {t("choose")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => onDrag(event, true)}
            onDragEnter={(event) => onDrag(event, true)}
            onDragLeave={(event) => onDrag(event, false)}
            onDrop={onDrop}
            className={cn(
              "group focus-visible:ring-ring/50 flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors focus-visible:ring-3 focus-visible:outline-none",
              dragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-accent/50",
            )}
          >
            <span className="bg-background ring-border rounded-full p-3 shadow-sm ring-1">
              <UploadCloud
                className={cn(
                  "h-5 w-5 transition-colors",
                  dragging
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
                aria-hidden
              />
            </span>
            <span className="text-sm font-medium">{t("dropTitle")}</span>
            <span className="text-muted-foreground text-xs">
              {t("dropDesc")}
            </span>
          </button>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => close(false)}
            disabled={importing}
          >
            {tCommon("cancel")}
          </Button>
          <Button onClick={runImport} disabled={!preview || importing}>
            {importing && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            )}
            {importing ? t("importing") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
