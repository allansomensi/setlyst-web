"use client";

import { useRef, useState, type DragEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Archive,
  Calendar,
  CheckCircle2,
  Download,
  FileJson,
  ListMusic,
  Loader2,
  Music,
  UploadCloud,
  Users,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppRouter } from "@/hooks/use-app-router";
import { useDownload } from "@/hooks/use-download";
import { toastActionError } from "@/lib/action-toast";
import { describeApiError } from "@/lib/api-errors";
import { useOfflineDisabled } from "@/components/offline-disabled";
import { cn } from "@/lib/utils";
import type { ImportBackupResponse } from "@/types/api";

/** Same ceiling as app/api/import/backup/route.ts (and the API). */
const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

function isJsonFile(file: File): boolean {
  return (
    file.type === "application/json" ||
    file.name.toLowerCase().endsWith(".json")
  );
}

/**
 * Settings → Backup: download the whole account as JSON, or restore one.
 *
 * Both go through the app's own route handlers (`/api/export/backup`,
 * `/api/import/backup`): the file can be several megabytes, beyond what a
 * server action accepts, and the API token stays on the server.
 */
export function BackupSection() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tApi = useTranslations("apiErrors");
  const locale = useLocale();
  const router = useAppRouter();
  const download = useDownload();
  const offlineDisabled = useOfflineDisabled();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportBackupResponse | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = isExporting || isImporting;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      const saved = await download(
        "/api/export/backup",
        `setlyst-backup-${date}.json`,
      );
      if (saved) toast.success(t("backupExportSuccess"));
    } finally {
      setIsExporting(false);
    }
  };

  /** Validates the chosen file and asks for confirmation. */
  const selectFile = (file: File) => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!isJsonFile(file)) {
      toast.error(t("backupInvalidFile"));
      return;
    }
    if (file.size > MAX_BACKUP_BYTES) {
      toast.error(t("backupTooLarge", { size: 10 }));
      return;
    }
    setPendingFile(file);
  };

  const runImport = async () => {
    const file = pendingFile;
    if (!file) return;
    setIsImporting(true);

    try {
      // Checked here rather than on the server so a wrong file gets a
      // clear message instead of a generic validation error.
      const text = await file.text();
      try {
        JSON.parse(text);
      } catch {
        toast.error(t("backupInvalidFile"));
        return;
      }

      let response: Response;
      try {
        response = await fetch("/api/import/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: text,
          credentials: "same-origin",
        });
      } catch {
        toast.error(t("backupImportFailed"));
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
          toast.error(t("backupTooLarge", { size: 10 }));
          return;
        }
        toast.error(
          describeApiError(
            body.code,
            body.meta,
            (key, values) => tApi(key, values),
            locale,
          ) ?? t("backupImportFailed"),
        );
        return;
      }

      const result = (await response.json()) as ImportBackupResponse;
      setImportResult(result);
      setPendingFile(null);
      toast.success(t("backupImportSuccess"));
      // The route handler revalidated the whole dashboard; refresh the
      // router cache of this tab too.
      router.refresh();
    } finally {
      setIsImporting(false);
    }
  };

  const onDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!busy) setIsDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) selectFile(file);
  };

  const counters = importResult
    ? [
        {
          icon: Users,
          label: t("backupArtists"),
          value: importResult.artists_imported ?? 0,
        },
        {
          icon: Music,
          label: t("backupSongs"),
          value: importResult.songs_imported ?? 0,
        },
        {
          icon: ListMusic,
          label: t("backupSetlists"),
          value: importResult.setlists_imported ?? 0,
        },
        {
          icon: Calendar,
          label: t("backupGigs"),
          value: importResult.gigs_imported ?? 0,
        },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="text-primary h-4 w-4" aria-hidden />
          {t("backupTitle")}
        </CardTitle>
        <CardDescription>{t("backupDescription")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="bg-muted/40 flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Download className="text-primary h-4 w-4" aria-hidden />
              <h4 className="text-foreground text-sm font-medium">
                {t("backupExportActionTitle")}
              </h4>
            </div>
            <p className="text-muted-foreground text-[13px]">
              {t("backupExportActionDesc")}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleExport}
              disabled={busy}
              className="mt-auto"
              {...offlineDisabled}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="mr-2 h-4 w-4" aria-hidden />
              )}
              {t("backupExportBtn")}
            </Button>
          </div>

          <div className="bg-muted/40 flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <UploadCloud className="text-primary h-4 w-4" aria-hidden />
              <h4 className="text-foreground text-sm font-medium">
                {t("backupImportBtn")}
              </h4>
            </div>
            <p className="text-muted-foreground text-[13px]">
              {t("backupImportActionDesc")}
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) selectFile(file);
              }}
              accept=".json,application/json"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              disabled={busy}
            />

            {/* A real button: reachable with Tab, opens the picker with
                Enter or Space, and still accepts a dropped file. */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={onDragOver}
              onDragEnter={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              disabled={busy || offlineDisabled.disabled}
              className={cn(
                "group focus-visible:ring-ring/50 mt-auto flex w-full items-center gap-3 rounded-lg border-2 border-dashed p-3 text-left transition-colors focus-visible:ring-3 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-accent/50",
              )}
            >
              <span className="bg-background ring-border shrink-0 rounded-full p-2 shadow-sm ring-1">
                {isImporting ? (
                  <Loader2
                    className="text-muted-foreground h-4 w-4 animate-spin"
                    aria-hidden
                  />
                ) : (
                  <UploadCloud
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isDragging
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                    aria-hidden
                  />
                )}
              </span>
              <span className="min-w-0">
                <span className="text-foreground block truncate text-sm font-medium">
                  {t("backupDropzoneTitle")}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {t("backupDropzoneDesc")}
                </span>
              </span>
            </button>
          </div>
        </div>

        {importResult && (
          <div
            role="status"
            className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-4 text-emerald-900 dark:border-emerald-500/15 dark:bg-emerald-500/5 dark:text-emerald-300"
          >
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2
                className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
              <span>{t("backupImportSuccessTitle")}</span>
            </div>
            <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-300/80">
              {t("backupImportResultDescription")}
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {counters.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="bg-card flex items-center gap-3 rounded-md border p-3"
                >
                  <Icon className="text-primary h-5 w-5" aria-hidden />
                  <div>
                    <dt className="text-muted-foreground text-xs">{label}</dt>
                    <dd className="text-foreground text-lg font-bold">
                      {value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        )}
      </CardContent>

      <Dialog
        open={pendingFile !== null}
        onOpenChange={(open) => {
          if (!open && !isImporting) setPendingFile(null);
        }}
      >
        <DialogContent showCloseButton={!isImporting}>
          <DialogHeader>
            <DialogTitle>{t("backupConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("backupConfirmDescription")}
            </DialogDescription>
          </DialogHeader>
          {pendingFile && (
            <div className="bg-muted/40 flex items-center gap-3 rounded-md border p-3">
              <FileJson
                className="text-muted-foreground h-5 w-5 shrink-0"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {pendingFile.name}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("backupFileSize", {
                    size: (pendingFile.size / (1024 * 1024)).toFixed(2),
                  })}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingFile(null)}
              disabled={isImporting}
            >
              {tCommon("cancel")}
            </Button>
            <Button onClick={runImport} disabled={isImporting}>
              {isImporting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              {isImporting ? t("backupImporting") : t("backupConfirmAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
