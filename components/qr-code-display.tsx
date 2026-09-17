"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

interface QrCodeDisplayProps {
  value: string;
  filename?: string;
  size?: number;
}

export function QrCodeDisplay({
  value,
  filename = "qrcode",
  size = 200,
}: QrCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = useTranslations("common");

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${filename}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-lg border bg-white p-3">
        <QRCodeCanvas
          ref={canvasRef}
          value={value}
          size={size}
          marginSize={2}
          level="M"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDownload}
      >
        <Download className="mr-2 h-4 w-4" />
        {t("downloadQrCode")}
      </Button>
    </div>
  );
}
