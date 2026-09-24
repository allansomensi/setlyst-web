import { getRequestConfig } from "next-intl/server";
import { getRequestTimeZone } from "@/lib/server/time-zone";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as never)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    // Dates rendered on the server (and handed to client components through
    // NextIntlClientProvider) use the viewer's zone, not the server's UTC.
    timeZone: await getRequestTimeZone(),
  };
});
