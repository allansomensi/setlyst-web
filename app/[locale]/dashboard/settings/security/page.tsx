import type { Metadata } from "next";
import { fetchServerApi } from "@/lib/api-server";
import { getMe } from "@/lib/server-data";
import { isGoogleSignInEnabled } from "@/lib/server/google-auth";
import { readPendingGoogleLink } from "@/lib/server/google-link";
import { getSession } from "@/lib/server/session";
import type { LinkedIdentity, SecurityOverview } from "@/types/account";
import {
  SecuritySection,
  type GoogleLinkStatus,
} from "../_components/security-section";
import { SettingsPage, settingsMetadata } from "../_components/settings-page";

export function generateMetadata(): Promise<Metadata> {
  return settingsMetadata("security");
}

const GOOGLE_STATUSES: readonly GoogleLinkStatus[] = [
  "confirm",
  "linked",
  "mismatch",
  "expired",
  "failed",
];

/** A failed load shows a notice in its card instead of the page failing. */
function orNull<T>(promise: Promise<T>): Promise<T | null> {
  return promise.catch(() => null);
}

export default async function SecuritySettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const readOnly = Boolean(session?.user.impersonator);

  const [me, security, identities] = await Promise.all([
    orNull(getMe()),
    orNull(fetchServerApi<SecurityOverview>("/users/me/security")),
    orNull(fetchServerApi<LinkedIdentity[]>("/users/me/identities")),
  ]);

  const googleParam = Array.isArray(params.google)
    ? params.google[0]
    : params.google;
  let googleStatus = GOOGLE_STATUSES.includes(googleParam as GoogleLinkStatus)
    ? (googleParam as GoogleLinkStatus)
    : null;
  // Back from Google to confirm a link: only when the token is still
  // waiting for this account (a reload after it was used, or a crafted
  // link, just says it expired).
  if (
    googleStatus === "confirm" &&
    (readOnly || !(await readPendingGoogleLink(session?.user.id)))
  ) {
    googleStatus = "expired";
  }

  return (
    <SettingsPage section="security">
      <SecuritySection
        username={me?.username ?? session?.user.name ?? ""}
        passwordSet={me?.password_set ?? security?.password_set ?? true}
        passwordChangedAt={me?.password_changed_at ?? null}
        security={security}
        identities={identities}
        googleEnabled={isGoogleSignInEnabled()}
        googleStatus={googleStatus}
        readOnly={readOnly}
      />
    </SettingsPage>
  );
}
