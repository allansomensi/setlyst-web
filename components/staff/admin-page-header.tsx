import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";

/**
 * Title block shared by the staff console pages. A thin alias of the
 * app's `PageHeader`, so the console reads exactly like the rest of the
 * dashboard: it used to keep its own copy (a fixed `text-3xl` title and
 * actions not aligned to the title's first line), which drifted from the
 * user-facing pages.
 */
export function AdminPageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** Buttons, primary last. */
  actions?: ReactNode;
  /** Extra content under the description (a notice, a meta line). */
  children?: ReactNode;
}) {
  return (
    <PageHeader title={title} description={description} actions={actions}>
      {children}
    </PageHeader>
  );
}
