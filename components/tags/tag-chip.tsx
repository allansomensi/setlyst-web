import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";

/** A song tag, shown the same way everywhere. */
export function TagChip({
  tag,
  className,
  children,
}: {
  tag: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "bg-secondary text-secondary-foreground inline-flex h-6 max-w-full items-center gap-0.5 rounded-full px-2 text-xs font-medium",
        className,
      )}
    >
      <Hash className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
      <span className="truncate">{tag}</span>
      {children}
    </span>
  );
}
