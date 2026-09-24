import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  Building2,
  Clock,
  Copyright,
  LifeBuoy,
  Mail,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@/components/nav-link";
import { PageIntro } from "@/components/site/page-intro";
import { LegalRichText } from "@/components/legal/legal-rich-text";
import { getLegalText } from "@/lib/legal-content";
import {
  CONTROLLER,
  COPYRIGHT_EMAIL,
  LEGAL_HREFS,
  PRIVACY_EMAIL,
  legalHref,
} from "@/lib/legal";
import { SUPPORT_EMAIL } from "@/lib/links";
import { publicPageMetadata } from "@/lib/seo";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return publicPageMetadata({
    locale,
    path: "/contato",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

function mailto(email: string, subject?: string) {
  return subject
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}`
    : `mailto:${email}`;
}

const linkClass =
  "text-primary font-medium underline-offset-4 hover:underline break-all";

/**
 * Contact page (Decreto 7.962/2013 art. 2º and art. 4º, V; LGPD art. 41;
 * the STF's requirement of a specific, permanently available notice
 * channel): who provides Setlyst, the support, privacy and copyright
 * channels, response times and what a copyright notice must contain. The
 * checklist is read from the Copyright Policy itself, so the two never
 * drift apart.
 */
export default async function ContactPage({ params }: { params: Params }) {
  const { locale } = await params;
  const t = await getTranslations("contact");

  const noticeList =
    getLegalText("copyright", locale)
      .sections.find((section) => section.id === "notice")
      ?.blocks.flatMap((block) =>
        typeof block === "object" && "list" in block ? block.list : [],
      ) ?? [];

  const docLink = (href: string) =>
    function DocLink(chunks: React.ReactNode) {
      return (
        <Link href={href} className={linkClass}>
          {chunks}
        </Link>
      );
    };
  const mailLink = (email: string, subject?: string) =>
    function MailLink(chunks: React.ReactNode) {
      return (
        <a href={mailto(email, subject)} className={linkClass}>
          {chunks}
        </a>
      );
    };

  const channels = [
    {
      key: "support",
      icon: LifeBuoy,
      email: SUPPORT_EMAIL,
      subject: undefined,
      body: t("channels.support.body"),
    },
    {
      key: "privacy",
      icon: ShieldCheck,
      email: PRIVACY_EMAIL,
      subject: undefined,
      body: t("channels.privacy.body", { name: CONTROLLER.name }),
    },
    {
      key: "copyright",
      icon: Copyright,
      email: COPYRIGHT_EMAIL,
      subject: t("report.subject"),
      body: t("channels.copyright.body"),
    },
    {
      key: "security",
      icon: Shield,
      email: SUPPORT_EMAIL,
      subject: t("channels.security.subject"),
      body: t.rich("channels.security.body", {
        policy: docLink(LEGAL_HREFS.security),
      }),
    },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <PageIntro
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <section
        aria-labelledby="provider"
        className="bg-card mt-10 rounded-2xl border p-6"
      >
        <h2
          id="provider"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <Building2 className="text-primary size-5" aria-hidden />
          {t("provider.heading")}
        </h2>
        <address className="text-muted-foreground mt-3 space-y-1 not-italic">
          <p className="text-foreground">
            <LegalRichText
              text={t("provider.body", {
                name: CONTROLLER.name,
                kind: CONTROLLER.kind,
                taxIdLabel: CONTROLLER.taxIdLabel,
                taxId: CONTROLLER.taxId,
              })}
            />
          </p>
          <p>
            <LegalRichText
              text={t("provider.address", { address: CONTROLLER.address })}
            />
          </p>
        </address>
      </section>

      <section aria-labelledby="channels" className="mt-10">
        <h2 id="channels" className="text-2xl font-bold tracking-tight">
          {t("channels.heading")}
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {channels.map(({ key, icon: Icon, email, subject, body }) => (
            <li
              key={key}
              className="bg-card flex flex-col gap-2 rounded-2xl border p-5"
            >
              <h3 className="flex items-center gap-2 font-semibold">
                <Icon className="text-primary size-5" aria-hidden />
                {t(`channels.${key}.title`)}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {body}
              </p>
              <a
                href={mailto(email, subject)}
                className={`${linkClass} mt-auto inline-flex items-center gap-1.5 text-sm`}
              >
                <Mail className="size-4 shrink-0" aria-hidden />
                {email}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="deadlines"
        className="bg-muted/40 mt-10 rounded-2xl border p-6"
      >
        <h2
          id="deadlines"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <Clock className="text-primary size-5" aria-hidden />
          {t("deadlines.heading")}
        </h2>
        <ul className="text-muted-foreground mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          <li>{t("deadlines.general")}</li>
          <li>{t("deadlines.copyright")}</li>
          <li>{t("deadlines.privacy")}</li>
        </ul>
      </section>

      <section
        id="report"
        aria-labelledby="report-heading"
        className="mt-10 scroll-mt-24"
      >
        <h2 id="report-heading" className="text-2xl font-bold tracking-tight">
          {t("report.heading")}
        </h2>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          {t.rich("report.intro", {
            email: COPYRIGHT_EMAIL,
            mail: mailLink(COPYRIGHT_EMAIL, t("report.subject")),
          })}
        </p>
        <ol className="text-foreground/90 marker:text-muted-foreground mt-4 list-[lower-alpha] space-y-2 pl-6 leading-relaxed">
          {noticeList.map((item) => (
            <li key={item} className="pl-1">
              {item}
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground mt-4 leading-relaxed">
          {t.rich("report.outro", {
            policy: docLink(legalHref("copyright", "notice")),
          })}
        </p>
        <p className="text-muted-foreground mt-4 leading-relaxed">
          {t.rich("report.other", {
            email: COPYRIGHT_EMAIL,
            mail: mailLink(COPYRIGHT_EMAIL, t("report.otherSubject")),
            guidelines: docLink(LEGAL_HREFS.guidelines),
          })}
        </p>
      </section>
    </div>
  );
}
