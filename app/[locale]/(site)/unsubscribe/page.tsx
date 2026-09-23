import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { inspectUnsubscribeToken } from "@/lib/public-api";
import { isPlausibleUnsubscribeToken } from "@/lib/unsubscribe";
import {
  InvalidState,
  StateIcon,
  UnsubscribeForm,
} from "./_components/unsubscribe-form";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ token?: string | string[] }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return {
    title: t("unsubscribeTitle"),
    // A personal, single-use link: keep it out of search results.
    robots: { index: false, follow: false },
  };
}

/**
 * Landing page of the unsubscribe link in every non-security e-mail
 * (`/{locale}/unsubscribe?token=...`). The GET only inspects the token;
 * unsubscribing needs an explicit confirmation, so link scanners in mail
 * clients never unsubscribe anyone by prefetching the link.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("unsubscribe");
  const raw = (await searchParams).token;
  const token = Array.isArray(raw) ? raw[0] : raw;

  const info = isPlausibleUnsubscribeToken(token)
    ? await inspectUnsubscribeToken(token)
    : { valid: false, category: null };

  return (
    <div className="mx-auto flex w-full max-w-xl px-4 py-16 sm:py-24">
      <div className="bg-card w-full rounded-2xl border p-6 shadow-xs sm:p-10">
        {info === null ? (
          <div role="status" className="space-y-5">
            <StateIcon tone="warning" />
            <h1 className="text-2xl font-bold tracking-tight">
              {t("unavailableTitle")}
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              {t("unavailableDescription")}
            </p>
          </div>
        ) : info.valid && token ? (
          <UnsubscribeForm token={token} category={info.category} />
        ) : (
          <InvalidState />
        )}
      </div>
    </div>
  );
}
