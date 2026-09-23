import { redirect } from "@/i18n/routing";
import { LEGAL_HREFS } from "@/lib/legal";

/** Friendly alias: the guidelines are one of the legal documents. */
export default async function CommunityGuidelinesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: LEGAL_HREFS.guidelines, locale });
}
