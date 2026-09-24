import { PublicLinkLayout } from "@/components/share/public-link-layout";

export default function PublicLinkRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLinkLayout>{children}</PublicLinkLayout>;
}
