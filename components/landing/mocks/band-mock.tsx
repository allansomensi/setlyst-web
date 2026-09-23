import { getTranslations } from "next-intl/server";
import { ListMusic, Pin, ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

const MEMBERS = [
  { initials: "MR", color: "bg-violet-500", roleKey: "roleOwner" },
  { initials: "LB", color: "bg-sky-500", roleKey: "roleAdmin" },
  { initials: "JP", color: "bg-amber-500", roleKey: "roleMember" },
  { initials: "CS", color: "bg-emerald-500", roleKey: "roleMember" },
] as const;

/**
 * Illustration of a band: members and roles, the shared repertoire, a
 * song suggestion being voted on and a pinned reminder. Decorative.
 */
export async function BandMock({ className }: { className?: string }) {
  const t = await getTranslations("landing.mock");

  return (
    <div aria-hidden className={cn("relative select-none", className)}>
      <div className="bg-card overflow-hidden rounded-2xl border shadow-xl shadow-black/5 dark:shadow-black/30">
        <div className="flex items-center gap-3 border-b px-4 py-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
            AU
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Banda Aurora</p>
            <p className="text-muted-foreground text-xs">
              {t("bandMeta", { members: MEMBERS.length })}
            </p>
          </div>
          <div className="flex -space-x-2">
            {MEMBERS.map((member) => (
              <span
                key={member.initials}
                className={cn(
                  "ring-card flex size-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2",
                  member.color,
                )}
              >
                {member.initials}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3 p-4 text-xs">
          <div className="bg-muted/50 flex items-center justify-between rounded-xl px-3 py-2.5">
            <span className="flex items-center gap-2 font-medium">
              <ListMusic className="text-primary size-4" />
              {t("repertoire")}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {t("songsCount", { count: 86 })}
            </span>
          </div>

          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              {t("suggestion")}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Vento Sul</p>
                <p className="text-muted-foreground">
                  {t("suggestedBy", { name: "@lu.bateria" })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 font-semibold text-emerald-700 tabular-nums dark:text-emerald-300">
                  <ThumbsUp className="size-3.5" />3
                </span>
                <span className="text-muted-foreground bg-muted flex items-center gap-1 rounded-md px-2 py-1 font-semibold tabular-nums">
                  <ThumbsDown className="size-3.5" />0
                </span>
              </div>
            </div>
            <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full">
              <div className="h-full w-3/4 rounded-full bg-emerald-500" />
            </div>
            <p className="text-muted-foreground mt-1.5">
              {t("autoAccept", { votes: 3, needed: 4 })}
            </p>
          </div>

          <ul className="grid gap-1.5">
            {MEMBERS.slice(0, 3).map((member) => (
              <li
                key={member.initials}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[9px] font-bold text-white",
                      member.color,
                    )}
                  >
                    {member.initials}
                  </span>
                  {t(member.roleKey)}
                </span>
                <span className="text-muted-foreground">
                  {t(`${member.roleKey}Can`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="absolute -right-3 -bottom-6 hidden w-56 rotate-2 rounded-xl border border-amber-500/30 bg-amber-50 p-3 text-xs text-amber-950 shadow-lg sm:block dark:bg-amber-950 dark:text-amber-100">
        <p className="flex items-center gap-1.5 font-semibold">
          <Pin className="size-3.5" />
          {t("reminderTitle")}
        </p>
        <p className="mt-1 leading-relaxed">{t("reminderBody")}</p>
      </div>
    </div>
  );
}
