import type { Metadata } from "next";
import { getMe } from "@/lib/server-data";
import { getSession } from "@/lib/server/session";
import { BackupSection } from "../_components/backup-section";
import { DeleteAccountSection } from "../_components/delete-account-section";
import { PersonalDataSection } from "../_components/personal-data-section";
import { SettingsPage, settingsMetadata } from "../_components/settings-page";

export function generateMetadata(): Promise<Metadata> {
  return settingsMetadata("data");
}

export default async function DataSettingsPage() {
  const [session, me] = await Promise.all([
    getSession(),
    getMe().catch(() => null),
  ]);
  const readOnly = Boolean(session?.user.impersonator);
  const username = me?.username ?? session?.user.name ?? "";

  return (
    <SettingsPage section="data">
      <BackupSection />
      {/* The owner's own data: not for staff viewing as the account (the
          API refuses it too). */}
      {!readOnly && <PersonalDataSection />}
      <DeleteAccountSection
        username={username}
        passwordSet={me?.password_set ?? true}
        readOnly={readOnly}
      />
    </SettingsPage>
  );
}
