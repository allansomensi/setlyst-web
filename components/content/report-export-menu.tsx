"use client";

import { useState, type RefObject } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Download,
  FileSpreadsheet,
  FileText,
  ImageDown,
  Loader2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/components/nav-link";
import { toast } from "@/lib/toast";
import { safeFileName, toCsv, type CsvCell } from "@/lib/csv";
import { dataUrlToBlob, saveBlob } from "@/lib/download";

export interface CsvTable {
  id: string;
  /** Menu label ("Tons", "Ordem das músicas"...). */
  label: string;
  header: CsvCell[];
  rows: CsvCell[][];
}

interface ReportExportMenuProps {
  /** The element captured for PNG and PDF. */
  targetRef: RefObject<HTMLElement | null>;
  /** Report title (PDF heading and file names). */
  title: string;
  tables: CsvTable[];
  /** `hasFeature(entitlements, "analytics_export")`. */
  allowed: boolean;
}

/** The page background, so the PNG isn't transparent in dark mode. */
function surfaceColor(): string {
  const color = getComputedStyle(document.body).backgroundColor;
  return color && color !== "rgba(0, 0, 0, 0)" ? color : "#ffffff";
}

async function capture(node: HTMLElement): Promise<string> {
  const { toPng } = await import("html-to-image");
  return toPng(node, {
    backgroundColor: surfaceColor(),
    pixelRatio: 2,
    cacheBust: true,
    // Buttons and menus aren't part of the report.
    filter: (el) =>
      !(el instanceof HTMLElement && el.dataset.exportIgnore !== undefined),
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * A4 portrait PDF: title and date on top, then the captured report split
 * across as many pages as needed, with margins.
 */
async function buildPdf(
  png: string,
  title: string,
  dateLine: string,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(title, margin, margin + 6, { maxWidth: contentWidth });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(110);
  pdf.text(dateLine, margin, margin + 12);
  pdf.setTextColor(0);

  const img = await loadImage(png);
  const mmPerPx = contentWidth / img.width;
  let offsetPx = 0;
  let top = margin + 18;
  let first = true;

  while (offsetPx < img.height) {
    const availableMm = pageHeight - margin - top;
    const slicePx = Math.min(
      img.height - offsetPx,
      Math.floor(availableMm / mmPerPx),
    );
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = slicePx;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img,
      0,
      offsetPx,
      img.width,
      slicePx,
      0,
      0,
      img.width,
      slicePx,
    );
    if (!first) pdf.addPage();
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      margin,
      top,
      contentWidth,
      slicePx * mmPerPx,
    );
    offsetPx += slicePx;
    first = false;
    top = margin;
  }

  return pdf.output("blob");
}

/**
 * "Exportar" for a statistics report: one CSV per table, the report as a
 * PNG, or as a paginated PDF. Everything runs in the browser. Without the
 * `analytics_export` feature the items stay visible but disabled, with a
 * pointer to the plans.
 */
export function ReportExportMenu({
  targetRef,
  title,
  tables,
  allowed,
}: ReportExportMenuProps) {
  const t = useTranslations("analytics.export");
  const locale = useLocale();
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);

  const stamp = new Date().toISOString().slice(0, 10);
  const base = `${title} ${stamp}`;

  const exportCsv = (table: CsvTable) => {
    const csv = toCsv(table.header, table.rows);
    saveBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      safeFileName(`${base} ${table.label}`, "csv"),
    );
    toast.success(t("csvDone"));
  };

  const exportImage = async (kind: "png" | "pdf") => {
    const node = targetRef.current;
    if (!node) return;
    setBusy(kind);
    try {
      const png = await capture(node);
      if (kind === "png") {
        const blob = dataUrlToBlob(png);
        saveBlob(blob, safeFileName(base, "png"));
      } else {
        const dateLine = t("generatedOn", {
          date: new Intl.DateTimeFormat(locale, {
            dateStyle: "long",
            timeStyle: "short",
          }).format(new Date()),
        });
        saveBlob(
          await buildPdf(png, title, dateLine),
          safeFileName(base, "pdf"),
        );
      }
      toast.success(kind === "png" ? t("pngDone") : t("pdfDone"));
    } catch (error) {
      console.error("[ReportExportMenu]", error);
      toast.error(t("failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" data-export-ignore>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="h-4 w-4" aria-hidden />
          )}
          <span className="sr-only sm:not-sr-only">{t("button")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {!allowed && (
          <>
            <div className="text-muted-foreground flex gap-2 px-2 py-1.5 text-xs">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                {t("locked")}{" "}
                <Link
                  href="/pricing"
                  className="text-primary font-medium underline-offset-2 hover:underline"
                >
                  {t("seePlans")}
                </Link>
              </span>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          disabled={!allowed || !!busy}
          onSelect={() => void exportImage("pdf")}
        >
          <FileText className="mr-2 h-4 w-4" aria-hidden />
          {t("pdf")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!allowed || !!busy}
          onSelect={() => void exportImage("png")}
        >
          <ImageDown className="mr-2 h-4 w-4" aria-hidden />
          {t("png")}
        </DropdownMenuItem>
        {tables.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
              {t("csvGroup")}
            </DropdownMenuLabel>
            {tables.map((table) => (
              <DropdownMenuItem
                key={table.id}
                disabled={!allowed}
                onSelect={() => exportCsv(table)}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden />
                {table.label}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
