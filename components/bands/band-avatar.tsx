import { cn } from "@/lib/utils";

interface BandAvatarProps {
  name: string;
  logoUrl?: string | null;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function BandAvatar({ name, logoUrl, className }: BandAvatarProps) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        className={cn(
          "h-10 w-10 shrink-0 rounded-lg border object-cover",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold",
        className,
      )}
      aria-hidden
    >
      {getInitials(name)}
    </div>
  );
}
