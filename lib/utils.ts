import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function parseDurationToSeconds(duration: string | null): number | null {
  if (!duration || !duration.includes(":")) return null;
  const [minutes, seconds] = duration.split(":").map(Number);
  return minutes * 60 + (seconds || 0);
}
