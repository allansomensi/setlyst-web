import type { Metadata } from "next";
import { HelpSection } from "../_components/help-section";
import { SettingsPage, settingsMetadata } from "../_components/settings-page";

export function generateMetadata(): Promise<Metadata> {
  return settingsMetadata("help");
}

export default function HelpSettingsPage() {
  return (
    <SettingsPage section="help">
      <HelpSection />
    </SettingsPage>
  );
}
