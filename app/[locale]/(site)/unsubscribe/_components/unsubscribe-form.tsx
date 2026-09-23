"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, Loader2, MailX, TriangleAlert } from "lucide-react";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import type { CommunicationCategory } from "@/types/public";
import { confirmUnsubscribe, type UnsubscribeState } from "../actions";

/** Where e-mail preferences are managed in the signed-in app. */
const MANAGE_HREF = "/dashboard/settings#communications";

export function UnsubscribeForm({
  token,
  category,
}: {
  token: string;
  category: CommunicationCategory | null;
}) {
  const t = useTranslations("unsubscribe");
  const [state, action, pending] = useActionState<UnsubscribeState, FormData>(
    confirmUnsubscribe,
    { status: "idle" },
  );

  const categoryLabel = (value: CommunicationCategory | null) =>
    value ? t(`categories.${value}`) : t("categories.generic");

  if (state.status === "success") {
    return (
      <div role="status" className="space-y-5">
        <StateIcon tone="success" />
        <h1 className="text-2xl font-bold tracking-tight">
          {t("successTitle")}
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          {t("successDescription", {
            category: categoryLabel(state.category ?? category),
          })}
        </p>
        <ManageLink />
      </div>
    );
  }

  if (state.status === "invalid") {
    return <InvalidState />;
  }

  return (
    <form action={action} className="space-y-5">
      <StateIcon tone="neutral" />
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground leading-relaxed">
        {t("confirmDescription", { category: categoryLabel(category) })}
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {t("securityNote")}
      </p>
      <input type="hidden" name="token" value={token} />
      {state.status === "error" && (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm"
        >
          {t("error")}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" size="lg" className="h-10" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {t("confirm")}
        </Button>
        <Button asChild variant="outline" size="lg" className="h-10">
          <Link href={MANAGE_HREF}>{t("manage")}</Link>
        </Button>
      </div>
    </form>
  );
}

export function InvalidState() {
  const t = useTranslations("unsubscribe");
  return (
    <div className="space-y-5">
      <StateIcon tone="warning" />
      <h1 className="text-2xl font-bold tracking-tight">{t("invalidTitle")}</h1>
      <p className="text-muted-foreground leading-relaxed">
        {t("invalidDescription")}
      </p>
      <ManageLink />
    </div>
  );
}

function ManageLink() {
  const t = useTranslations("unsubscribe");
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button asChild size="lg" className="h-10">
        <Link href={MANAGE_HREF}>{t("manage")}</Link>
      </Button>
      <Button asChild variant="ghost" size="lg" className="h-10">
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </div>
  );
}

export function StateIcon({
  tone,
}: {
  tone: "success" | "warning" | "neutral";
}) {
  const Icon =
    tone === "success"
      ? CircleCheck
      : tone === "warning"
        ? TriangleAlert
        : MailX;
  return (
    <span
      aria-hidden
      className={
        tone === "success"
          ? "flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : tone === "warning"
            ? "flex size-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400"
            : "bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full"
      }
    >
      <Icon className="size-6" />
    </span>
  );
}
