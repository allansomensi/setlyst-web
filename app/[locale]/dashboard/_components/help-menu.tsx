"use client";

import { useTranslations } from "next-intl";
import {
  Activity,
  BookOpen,
  FileText,
  Info,
  CircleHelp,
  ExternalLink,
  Lock,
  Mail,
  Megaphone,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_PATH, SUPPORT_EMAIL, WIKI_URL } from "@/lib/links";

/**
 * Everything "about the platform" behind one icon: talking to support,
 * documentation, system status, the legal documents and the About page.
 */
export function HelpMenu({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const tLegal = useTranslations("legal");
  const tAnnouncements = useTranslations("announcements");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          // size-10 on touch screens, like the links beside it.
          className="text-muted-foreground hover:text-foreground h-9 w-9 pointer-coarse:size-10"
          aria-label={t("help")}
          title={t("help")}
        >
          <CircleHelp className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      {/* Kept off the window's edges: aligned to its end, the menu ran
          past the left edge from the sidebar's footer and was pushed
          flush against it. */}
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        collisionPadding={8}
        className="w-56"
      >
        <DropdownMenuLabel>{t("help")}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a href={`mailto:${SUPPORT_EMAIL}`} onClick={onNavigate}>
            <Mail className="mr-2 h-4 w-4" aria-hidden />
            <span className="min-w-0">
              <span className="block">{t("contactSupport")}</span>
              <span className="text-muted-foreground block truncate text-xs">
                {SUPPORT_EMAIL}
              </span>
            </span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={WIKI_URL}
            target="_blank"
            rel="noreferrer"
            onClick={onNavigate}
          >
            <BookOpen className="mr-2 h-4 w-4" aria-hidden />
            {t("wiki")}
            {/* Opens in a new tab, unlike everything else here. */}
            <ExternalLink
              className="text-muted-foreground ml-auto h-3.5 w-3.5"
              aria-hidden
            />
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={STATUS_PATH} onClick={onNavigate}>
            <Activity className="mr-2 h-4 w-4" aria-hidden />
            {t("status")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/about" onClick={onNavigate}>
            <Info className="mr-2 h-4 w-4" aria-hidden />
            {t("about")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/announcements" onClick={onNavigate}>
            <Megaphone className="mr-2 h-4 w-4" aria-hidden />
            {tAnnouncements("pageTitle")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
          {tLegal("title")}
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/legal/terms" onClick={onNavigate}>
            <FileText className="mr-2 h-4 w-4" aria-hidden />
            {tLegal("documents.terms.short")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/legal/privacy" onClick={onNavigate}>
            <Lock className="mr-2 h-4 w-4" aria-hidden />
            {tLegal("documents.privacy.short")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/legal/security" onClick={onNavigate}>
            <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
            {tLegal("documents.security.short")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
