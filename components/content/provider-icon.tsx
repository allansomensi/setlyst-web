import {
  AudioLines,
  AudioWaveform,
  Box,
  Cloud,
  HardDrive,
  Link2,
  Music2,
  Play,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LinkProvider } from "@/types/content";

/**
 * Provider marks. Brand logos aren't bundled (and lucide dropped them), so
 * each provider gets a generic icon on its brand colour, always shown
 * next to the provider's name.
 */
const PROVIDER_STYLES: Record<
  LinkProvider,
  { icon: LucideIcon; tile: string }
> = {
  youtube: { icon: Play, tile: "bg-red-600 text-white" },
  spotify: { icon: AudioLines, tile: "bg-green-600 text-white" },
  google_drive: { icon: HardDrive, tile: "bg-blue-600 text-white" },
  apple_music: { icon: Music2, tile: "bg-pink-600 text-white" },
  deezer: { icon: AudioWaveform, tile: "bg-violet-600 text-white" },
  soundcloud: { icon: Cloud, tile: "bg-orange-600 text-white" },
  dropbox: { icon: Box, tile: "bg-sky-600 text-white" },
  onedrive: { icon: Cloud, tile: "bg-blue-700 text-white" },
};

export function ProviderIcon({
  provider,
  className,
}: {
  provider: LinkProvider | null;
  className?: string;
}) {
  const style = provider ? PROVIDER_STYLES[provider] : null;
  const Icon = style?.icon ?? Link2;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
        style?.tile ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}
