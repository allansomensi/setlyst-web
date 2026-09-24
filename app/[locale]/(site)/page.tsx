import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Check,
  FileDown,
  Link2,
  ListMusic,
  Mic2,
  ShieldCheck,
  ThumbsUp,
  Users,
  WifiOff,
  CalendarRange,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/components/nav-link";
import { BandMock } from "@/components/landing/mocks/band-mock";
import { LiveControlsMock } from "@/components/landing/mocks/live-controls-mock";
import { LiveModeMock } from "@/components/landing/mocks/live-mode-mock";
import { SetlistMock } from "@/components/landing/mocks/setlist-mock";
import { BillingNote } from "@/components/site/billing-note";
import { FaqList } from "@/components/site/faq-list";
import { Button } from "@/components/ui/button";
import { pickLocalized } from "@/lib/localized";
import { isBillingEnforced } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";
import { getPublicPlans } from "@/lib/public-api";
import { getSiteOrigin, publicPageMetadata } from "@/lib/seo";
import { isSignedIn } from "@/lib/site-session";
import { cn } from "@/lib/utils";
import type { PublicPlan } from "@/types/public";
import { getNonce } from "@/lib/server/nonce";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return publicPageMetadata({
    locale,
    path: "/",
    title: t("landingTitle"),
    description: t("landingDescription"),
    absoluteTitle: true,
    largeImage: true,
  });
}

const SHOWCASE = [
  { key: "live", icon: Mic2, Mock: LiveControlsMock },
  { key: "setlists", icon: ListMusic, Mock: SetlistMock },
  { key: "bands", icon: Users, Mock: BandMock },
] as const;

const GRID: { key: string; icon: LucideIcon }[] = [
  { key: "suggestions", icon: ThumbsUp },
  { key: "tours", icon: CalendarRange },
  { key: "export", icon: FileDown },
  { key: "offline", icon: WifiOff },
  { key: "sharing", icon: Link2 },
  { key: "security", icon: ShieldCheck },
];

const FAQ_KEYS = [
  "price",
  "offline",
  "bands",
  "content",
  "devices",
  "data",
] as const;

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-primary text-sm font-semibold tracking-wide">
        {eyebrow}
      </p>
      <h2
        id={id}
        className="mt-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl"
      >
        {title}
      </h2>
      {description && (
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed text-pretty">
          {description}
        </p>
      )}
    </div>
  );
}

/** `SoftwareApplication` structured data, with the plans as offers. */
function jsonLd(
  plans: PublicPlan[] | null,
  locale: string,
  description: string,
): string {
  const origin = getSiteOrigin();
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Setlyst",
    applicationCategory: "MusicApplication",
    operatingSystem: "Web, Android, iOS, Windows, macOS, Linux",
    description,
    url: `${origin}/${locale}`,
    inLanguage: ["pt-BR", "en", "es"],
    ...(plans && plans.length > 0
      ? {
          offers: plans.map((plan) => ({
            "@type": "Offer",
            name: pickLocalized(plan.name, locale) || plan.code,
            price: (plan.price_monthly_cents / 100).toFixed(2),
            priceCurrency: plan.currency,
            url: `${origin}/${locale}/pricing`,
          })),
        }
      : {}),
  };
  // Escape "<" so the JSON can never close the script tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function LandingPage({ params }: { params: Params }) {
  const { locale } = await params;
  const t = await getTranslations("landing");
  const tSeo = await getTranslations("seo");
  const [signedIn, plans, nonce] = await Promise.all([
    isSignedIn(),
    getPublicPlans(),
    getNonce(),
  ]);
  const enforced = isBillingEnforced();

  const primaryCta = signedIn ? (
    <Button asChild size="lg" className="h-11 px-5 text-base">
      <Link href="/dashboard">
        {t("hero.ctaDashboard")}
        <ArrowRight data-icon="inline-end" />
      </Link>
    </Button>
  ) : (
    <Button asChild size="lg" className="h-11 px-5 text-base">
      <Link href="/register">
        {t("hero.ctaPrimary")}
        <ArrowRight data-icon="inline-end" />
      </Link>
    </Button>
  );

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: jsonLd(plans, locale, tSeo("landingDescription")),
        }}
      />

      {/* Hero */}
      <section
        aria-labelledby="hero-title"
        className="relative isolate overflow-hidden"
      >
        <div
          aria-hidden
          className="landing-grid pointer-events-none absolute inset-0 -z-10"
        />
        <div
          aria-hidden
          className="bg-primary/10 sm:bg-primary/20 dark:bg-primary/15 pointer-events-none absolute -top-40 left-1/2 -z-10 h-[32rem] w-[56rem] -translate-x-1/2 rounded-full blur-3xl"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:pb-28">
          <div>
            <p className="bg-background/80 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm backdrop-blur">
              <span className="bg-primary size-2 rounded-full" />
              {enforced ? t("hero.badgeTrial") : t("hero.badgePreRelease")}
            </p>
            <h1
              id="hero-title"
              className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl"
            >
              {t("hero.title")}
            </h1>
            <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed text-pretty">
              {t("hero.description")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {primaryCta}
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 px-5 text-base"
              >
                <Link href="/pricing">{t("hero.ctaSecondary")}</Link>
              </Button>
            </div>
            <ul className="text-muted-foreground mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {(["noCard", "offline", "languages"] as const).map((key) => (
                <li key={key} className="flex items-center gap-1.5">
                  <Check className="text-primary size-4" />
                  {t(`hero.points.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative lg:pl-4">
            <LiveModeMock className="lg:rotate-1" />
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section
        id="features"
        aria-labelledby="features-title"
        className="scroll-mt-20 border-t py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            id="features-title"
            eyebrow={t("features.eyebrow")}
            title={t("features.title")}
            description={t("features.description")}
          />

          <div className="mt-16 space-y-24 sm:mt-20">
            {SHOWCASE.map(({ key, icon: Icon, Mock }, index) => (
              <article
                key={key}
                aria-labelledby={`showcase-${key}`}
                className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
              >
                <div className={cn(index % 2 === 1 && "lg:order-2")}>
                  <span className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold">
                    <Icon className="size-4" />
                    {t(`showcase.${key}.label`)}
                  </span>
                  <h3
                    id={`showcase-${key}`}
                    className="mt-4 text-2xl font-bold tracking-tight text-balance sm:text-3xl"
                  >
                    {t(`showcase.${key}.title`)}
                  </h3>
                  <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
                    {t(`showcase.${key}.description`)}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {(["b1", "b2", "b3"] as const).map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span className="bg-primary/10 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                          <Check className="size-3.5" />
                        </span>
                        <span>{t(`showcase.${key}.${bullet}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  className={cn(
                    "mx-auto w-full max-w-md lg:max-w-none",
                    index % 2 === 1 && "lg:order-1",
                  )}
                >
                  <Mock />
                </div>
              </article>
            ))}
          </div>

          <ul className="mt-28 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GRID.map(({ key, icon: Icon }) => (
              <li
                key={key}
                className="bg-card rounded-2xl border p-6 shadow-xs transition-shadow hover:shadow-md"
              >
                <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{t(`grid.${key}.title`)}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {t(`grid.${key}.description`)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section
        aria-labelledby="how-title"
        className="bg-muted/40 border-y py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            id="how-title"
            eyebrow={t("how.eyebrow")}
            title={t("how.title")}
          />
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {(["s1", "s2", "s3"] as const).map((step, index) => (
              <li
                key={step}
                className="bg-card relative rounded-2xl border p-6 shadow-xs sm:p-7"
              >
                <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full text-sm font-bold">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold">
                  {t(`how.${step}.title`)}
                </h3>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  {t(`how.${step}.description`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Plans teaser */}
      <section aria-labelledby="plans-title" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            id="plans-title"
            eyebrow={t("plans.eyebrow")}
            title={t("plans.title")}
            description={t("plans.description")}
          />
          <div className="mt-6 flex justify-center">
            <BillingNote />
          </div>
          {plans && plans.length > 0 && (
            <ul className="mt-12 grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <li
                  key={plan.code}
                  className={cn(
                    "bg-card flex flex-col rounded-2xl border p-6 shadow-xs",
                    plan.highlighted &&
                      "border-primary/60 ring-primary/15 ring-4",
                  )}
                >
                  <h3 className="text-lg font-semibold">
                    {pickLocalized(plan.name, locale) || plan.code}
                  </h3>
                  <p className="text-muted-foreground mt-1 flex-1 text-sm leading-relaxed">
                    {pickLocalized(plan.description, locale)}
                  </p>
                  <p className="mt-5 text-sm">
                    {plan.price_monthly_cents > 0 ? (
                      t.rich("plans.from", {
                        price: formatMoney(
                          plan.price_monthly_cents,
                          plan.currency,
                          locale,
                        ),
                        strong: (chunks) => (
                          <strong className="text-2xl font-bold tracking-tight tabular-nums">
                            {chunks}
                          </strong>
                        ),
                      })
                    ) : (
                      <strong className="text-2xl font-bold">
                        {t("plans.free")}
                      </strong>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-10 flex justify-center">
            <Button asChild variant="outline" size="lg" className="h-11 px-5">
              <Link href="/pricing">
                {t("plans.cta")}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="border-t py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHeading
            id="faq-title"
            eyebrow={t("faq.eyebrow")}
            title={t("faq.title")}
          />
          <FaqList
            className="mt-12"
            items={FAQ_KEYS.map((key) => ({
              question: t(`faq.${key}.q`),
              answer:
                key === "price"
                  ? enforced
                    ? t("faq.price.aEnforced")
                    : t("faq.price.aPreRelease")
                  : t(`faq.${key}.a`),
            }))}
          />
        </div>
      </section>

      {/* Final CTA */}
      <section
        aria-labelledby="cta-title"
        className="px-4 pb-20 sm:px-6 sm:pb-28"
      >
        <div className="bg-primary text-primary-foreground relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12 sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.18),transparent_60%)]"
          />
          <h2
            id="cta-title"
            className="relative text-3xl font-bold tracking-tight text-balance sm:text-4xl"
          >
            {t("finalCta.title")}
          </h2>
          <p className="text-primary-foreground/85 relative mx-auto mt-4 max-w-xl text-lg">
            {t("finalCta.description")}
          </p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="h-11 px-5 text-base"
            >
              <Link href={signedIn ? "/dashboard" : "/register"}>
                {signedIn ? t("hero.ctaDashboard") : t("hero.ctaPrimary")}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="hover:bg-primary-foreground/10 hover:text-primary-foreground h-11 px-5 text-base"
            >
              <Link href="/pricing">{t("hero.ctaSecondary")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
