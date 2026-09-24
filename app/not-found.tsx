import { PublicLinkLayout } from "@/components/share/public-link-layout";
import { RootNotFoundContent } from "@/components/share/root-not-found";

/**
 * 404 for addresses outside any locale (a mistyped /s/ link, say). Paths
 * under a locale get app/[locale]/not-found.tsx instead.
 */
export default function RootNotFound() {
  return (
    <PublicLinkLayout>
      <RootNotFoundContent />
    </PublicLinkLayout>
  );
}
