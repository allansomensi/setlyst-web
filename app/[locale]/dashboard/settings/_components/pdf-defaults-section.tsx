"use client";

import { useState, useTransition } from "react";
import { FileText, Loader2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUiSettings } from "@/components/providers/ui-settings-provider";
import { PdfOptionsEditor } from "@/components/setlists/pdf-options-editor";
import { toastActionError } from "@/lib/action-toast";
import {
  DEFAULT_PDF_OPTIONS,
  type PdfExportOptions,
} from "@/lib/pdf-export-options";

/** The options every PDF export starts from, on every device. */
export function PdfDefaultsSection() {
  const t = useTranslations("settings.pdf");
  const tCommon = useTranslations("common");
  const { settings, update } = useUiSettings();
  const [draft, setDraft] = useState<PdfExportOptions>(settings.pdf);
  const [isPending, startTransition] = useTransition();

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings.pdf);

  const save = () => {
    startTransition(async () => {
      const result = await update({ pdf: draft });
      if (!result.success) toastActionError(result, result.error);
      else toast.success(t("saved"));
    });
  };

  return (
    <Card id="pdf">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="text-primary h-4 w-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <PdfOptionsEditor
          value={draft}
          onChange={setDraft}
          disabled={isPending}
        />
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDraft(DEFAULT_PDF_OPTIONS)}
          disabled={isPending}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          {t("restore")}
        </Button>
        <Button onClick={save} disabled={!dirty || isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {tCommon("save")}
        </Button>
      </CardFooter>
    </Card>
  );
}
