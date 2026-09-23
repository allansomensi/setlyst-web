import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Bug,
  ShieldCheck,
  Sparkles,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAppLocale } from "@/i18n/locales";
import { WIKI_URL } from "@/lib/links";
import { RELEASE_NOTES, type ReleaseItemKind } from "@/lib/whats-new";
import { MarkReleasesSeen } from "./_components/mark-releases-seen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("whatsNew");
  return { title: t("title") };
}

const KIND_ICONS: Record<ReleaseItemKind, LucideIcon> = {
  new: Sparkles,
  improved: Wand2,
  fixed: Bug,
  security: ShieldCheck,
};

const KIND_STYLES: Record<ReleaseItemKind, string> = {
  new: "border-sky-500/30 text-sky-700 dark:text-sky-300",
  improved: "border-violet-500/30 text-violet-700 dark:text-violet-300",
  fixed: "border-amber-500/30 text-amber-700 dark:text-amber-300",
  security: "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
};

export default async function WhatsNewPage() {
  const t = await getTranslations("whatsNew");
  const rawLocale = await getLocale();
  const locale = isAppLocale(rawLocale) ? rawLocale : "en";
  const dateFormat = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <MarkReleasesSeen />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t.rich("description", {
            wiki: (chunks) => (
              <a
                href={WIKI_URL}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>

      <ol className="space-y-6">
        {RELEASE_NOTES.map((release, index) => (
          <li key={release.id}>
            <Card>
              <CardHeader className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant={index === 0 ? "default" : "secondary"}>
                    v{release.version}
                  </Badge>
                  <time
                    dateTime={release.date}
                    className="text-muted-foreground"
                  >
                    {dateFormat.format(new Date(`${release.date}T00:00:00Z`))}
                  </time>
                  {index === 0 && (
                    <Badge variant="outline">{t("latest")}</Badge>
                  )}
                </div>
                <CardTitle className="text-xl">
                  {release.title[locale]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {release.items.map((item, i) => {
                    const Icon = KIND_ICONS[item.kind];
                    return (
                      <li key={i} className="flex gap-3">
                        <Badge
                          variant="outline"
                          className={`mt-0.5 shrink-0 ${KIND_STYLES[item.kind]}`}
                        >
                          <Icon />
                          {t(`kinds.${item.kind}`)}
                        </Badge>
                        <p className="text-sm leading-relaxed">
                          {item.text[locale]}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
