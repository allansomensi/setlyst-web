"use client";

import { useState, useRef, useTransition, DragEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Download,
  Loader2,
  CheckCircle2,
  Music,
  Users,
  ListMusic,
  UploadCloud,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { exportBackup, importBackup } from "../actions";
import { ImportBackupResponse, ImportBackupPayload } from "@/types/api";
import { cn } from "@/lib/utils";

export function BackupSection() {
  const t = useTranslations("settings");
  const [isPending, startTransition] = useTransition();
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<ImportBackupResponse | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    startTransition(async () => {
      const result = await exportBackup();

      if (result.success) {
        if (!result.data) {
          toast.error("No data returned for export");
          return;
        }

        const dataStr = JSON.stringify(result.data, null, 2);
        const dataUri =
          "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
        const exportFileDefaultName = `setlyst-backup-${new Date().toISOString().split("T")[0]}.json`;

        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportFileDefaultName);
        linkElement.click();

        toast.success(t("backupExportSuccess"));
      } else {
        toast.error(result.error || "Failed to export backup");
      }
    });
  };

  const processFile = (file: File) => {
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      toast.error(t("backupInvalidFile") || "Invalid backup file.");
      return;
    }

    startTransition(async () => {
      try {
        const fileContent = await file.text();
        const backupData = JSON.parse(fileContent) as ImportBackupPayload;

        const result = await importBackup(backupData);

        if (result.success) {
          if (result.data) {
            setImportResult(result.data as ImportBackupResponse);
          }
          toast.success(t("backupImportSuccess"));
        } else {
          toast.error(result.error || "Failed to import backup");
        }
      } catch {
        toast.error(t("backupInvalidFile"));
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isPending) return;

    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <Card className="md:bg-card border-none bg-transparent shadow-none md:border md:shadow-sm">
      <CardHeader className="px-2 pt-0 sm:px-6 md:px-8 md:pt-6">
        <CardTitle className="text-xl font-semibold">
          {t("backupTitle")}
        </CardTitle>
        <CardDescription>{t("backupDescription")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 p-2 sm:p-6 md:p-8">
        <div className="border-border bg-muted/30 flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <h4 className="text-foreground text-sm font-medium">
              {t("backupExportActionTitle")}
            </h4>
            <p className="text-muted-foreground hidden text-[13px] sm:block">
              {t("backupExportActionDesc")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleExport}
            disabled={isPending}
            className="shrink-0"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {t("backupExportBtn")}
          </Button>
        </div>

        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !isPending && fileInputRef.current?.click()}
          className={cn(
            "group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 transition-all duration-200",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:bg-accent/50 hover:border-muted-foreground/50",
            isPending && "pointer-events-none opacity-60",
          )}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
            disabled={isPending}
          />

          <div className="bg-background ring-border group-hover:ring-muted-foreground/30 rounded-full p-3 shadow-sm ring-1 transition-all duration-200">
            {isPending ? (
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            ) : (
              <UploadCloud
                className={cn(
                  "h-6 w-6 transition-colors duration-200",
                  isDragging
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
            )}
          </div>

          <div className="text-center">
            <p className="text-foreground text-sm font-medium">
              {t("backupDropzoneTitle")}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {t("backupDropzoneDesc")}
            </p>
          </div>
        </div>

        {importResult && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-900 transition-all duration-300 dark:border-emerald-500/10 dark:bg-emerald-500/5 dark:text-emerald-400">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span>{t("backupImportSuccessTitle")}</span>
            </div>
            <p className="mt-1 text-sm text-emerald-800/80 dark:text-emerald-400/80">
              {t("backupImportResultDescription")}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-background/60 dark:bg-background/40 flex items-center gap-3 rounded-md border border-emerald-500/20 p-3 shadow-sm dark:border-emerald-500/10">
                <Users className="text-primary h-5 w-5" />
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t("backupArtists")}
                  </div>
                  <div className="text-foreground text-lg font-bold">
                    {importResult.artists_imported ?? 0}
                  </div>
                </div>
              </div>

              <div className="bg-background/60 dark:bg-background/40 flex items-center gap-3 rounded-md border border-emerald-500/20 p-3 shadow-sm dark:border-emerald-500/10">
                <Music className="text-primary h-5 w-5" />
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t("backupSongs")}
                  </div>
                  <div className="text-foreground text-lg font-bold">
                    {importResult.songs_imported ?? 0}
                  </div>
                </div>
              </div>

              <div className="bg-background/60 dark:bg-background/40 flex items-center gap-3 rounded-md border border-emerald-500/20 p-3 shadow-sm dark:border-emerald-500/10">
                <ListMusic className="text-primary h-5 w-5" />
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t("backupSetlists")}
                  </div>
                  <div className="text-foreground text-lg font-bold">
                    {importResult.setlists_imported ?? 0}
                  </div>
                </div>
              </div>

              <div className="bg-background/60 dark:bg-background/40 flex items-center gap-3 rounded-md border border-emerald-500/20 p-3 shadow-sm dark:border-emerald-500/10">
                <Calendar className="text-primary h-5 w-5" />
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t("backupGigs")}
                  </div>
                  <div className="text-foreground text-lg font-bold">
                    {importResult.gigs_imported ?? 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
