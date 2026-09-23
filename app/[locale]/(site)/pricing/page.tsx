import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CloudOff } from "lucide-react";
import { Link } from "@/components/nav-link";
import { PlanComparison } from "@/components/pricing/plan-comparison";
import { PricingPlans } from "@/components/pricing/pricing-plans";
import { BillingNote } from "@/components/site/billing-note";
import { FaqList } from "@/components/site/faq-list";
import { PageIntro } from "@/components/site/page-intro";
import { Button } from "@/components/ui/button";
import { LEGAL_HREFS } from "@/lib/legal";
import { isBillingEnforced } from "@/lib/pricing";
import { getPublicPlans } from "@/lib/public-api";
import { publicPageMetadata } from "@/lib/seo";

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
    path: "/pricing",
    title: t("pricingTitle"),
    description: t("pricingDescription"),
  });
}

const FAQ_KEYS = [
  "free",
  "trialEnd",
  "cancel",
  "withdrawal",
  "limits",
  "credits",
  "referral",
] as const;

export default async function PricingPage({ params }: { params: Params }) {
  const { locale } = await params;
  const t = await getTranslations("pricing");
  const plans = await getPublicPlans();
  const enforced = isBillingEnforced();

  const docLink = (href: string) =>
    function DocLink(chunks: React.ReactNode) {
      return (
        <Link
          href={href}
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          {chunks}
        </Link>
      );
    };

  const faq = FAQ_KEYS.map((key) => ({
    question: t(`faq.${key}.q`),
    answer: t.rich(
      key === "free"
        ? enforced
          ? "faq.free.aEnforced"
          : "faq.free.aPreRelease"
        : `faq.${key}.a`,
      {
        subscription: docLink(LEGAL_HREFS.subscription),
        terms: docLink(LEGAL_HREFS.terms),
      },
    ),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <PageIntro
        align="center"
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      >
        <div className="mt-6 flex justify-center">
          <BillingNote />
        </div>
      </PageIntro>

      <section aria-label={t("plansLabel")} className="mt-12">
        {plans && plans.length > 0 ? (
          <PricingPlans plans={plans} />
        ) : (
          <div
            role="status"
            className="bg-card mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-12 text-center"
          >
            <CloudOff className="text-muted-foreground size-8" />
            <p className="text-muted-foreground">{t("unavailable")}</p>
            <Button asChild size="lg">
              <Link href="/register">{t("ctaGeneric")}</Link>
            </Button>
          </div>
        )}
        <p className="text-muted-foreground mt-6 text-center text-sm">
          {t("pricesNote")}
        </p>
      </section>

      {plans && plans.length > 0 && (
        <section aria-labelledby="compare" className="mt-20">
          <h2
            id="compare"
            className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {t("compareTitle")}
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center">
            {t("compareDescription")}
          </p>
          <div className="mt-8">
            <PlanComparison plans={plans} locale={locale} />
          </div>
        </section>
      )}

      <section
        aria-labelledby="pricing-faq"
        className="mx-auto mt-20 max-w-3xl"
      >
        <h2
          id="pricing-faq"
          className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
        >
          {t("faqTitle")}
        </h2>
        <FaqList items={faq} className="mt-8" />
      </section>
    </div>
  );
}
