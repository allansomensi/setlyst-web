import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const locale = await getLocale();

  redirect(`/${locale}/dashboard`);
}
