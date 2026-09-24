import { ScopedMessages } from "@/components/providers/scoped-messages";

/** User management is part of the staff console: its translations too. */
export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ScopedMessages area="staff">{children}</ScopedMessages>;
}
