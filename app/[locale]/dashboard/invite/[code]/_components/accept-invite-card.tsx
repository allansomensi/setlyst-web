"use client";

import { useState, useTransition } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { acceptBandInvite } from "@/app/[locale]/dashboard/bands/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/nav-link";

export function AcceptInviteCard({ code }: { code: string }) {
  const t = useTranslations("bands.acceptInvite");
  const router = useAppRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAccept = () => {
    setError(null);
    startTransition(async () => {
      const result = await acceptBandInvite(code);
      if (result.success) {
        const band = result.data;
        router.push(band ? `/dashboard/bands/${band.id}` : "/dashboard/bands");
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Card className="w-full items-center px-6 py-10 text-center">
      <Users2 className="text-primary mb-2 h-10 w-10" />
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground text-sm">{t("description")}</p>
      <p className="bg-muted text-muted-foreground mt-2 w-fit rounded-md border px-3 py-1 font-mono text-sm">
        {code}
      </p>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="mt-4 flex gap-2">
        <Button variant="outline" asChild disabled={isPending}>
          <Link href="/dashboard/bands">{t("cancel")}</Link>
        </Button>
        <Button onClick={handleAccept} disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("accept")}
        </Button>
      </div>
    </Card>
  );
}
