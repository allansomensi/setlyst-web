import type { ReactNode } from "react";

/** Title block shared by the staff console pages. */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-3xl font-bold tracking-tight break-words">
          {title}
        </h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      )}
    </div>
  );
}
