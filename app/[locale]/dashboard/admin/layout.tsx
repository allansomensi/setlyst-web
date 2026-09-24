import { requireStaffPage } from "@/lib/staff-guard";
import { ScopedMessages } from "@/components/providers/scoped-messages";

/**
 * The staff console. Every page under it is for admins and moderators;
 * admin-only pages add their own `requireStaffPage(capability)` check
 * (lib/staff-permissions.ts lists what each role reaches), and the API
 * enforces the same split (moderators review, admins change).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffPage();
  return (
    <ScopedMessages area="staff">
      <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
    </ScopedMessages>
  );
}
