import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import {
  clientMessages,
  type ClientMessagesArea,
} from "@/i18n/client-messages";

/**
 * Hands the client components below it the translations of one area of
 * the app, in place of the smaller set the `[locale]` layout provides.
 * See i18n/client-messages.ts.
 */
export async function ScopedMessages({
  area,
  children,
}: {
  area: ClientMessagesArea;
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={clientMessages(messages, area)}>
      {children}
    </NextIntlClientProvider>
  );
}
