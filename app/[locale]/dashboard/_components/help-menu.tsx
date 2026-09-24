"use client";

import { useTranslations } from "next-intl";
import {
  Activity,
  BookOpen,
  FileText,
  Info,
  CircleHelp,
  Lock,
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
import { STATUS_PATH, WIKI_URL } from "@/lib/links";

/**
 * Everything "about the platform" behind one icon: documentation, system
 * status, the legal documents and the About page.
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
          className="text-muted-foreground hover:text-foreground h-9 w-9"
          aria-label={t("help")}
          title={t("help")}
        >
          <CircleHelp className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-56">
        <DropdownMenuLabel>{t("help")}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a
            href={WIKI_URL}
            target="_blank"
            rel="noreferrer"
            onClick={onNavigate}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            {t("wiki")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={STATUS_PATH} onClick={onNavigate}>
            <Activity className="mr-2 h-4 w-4" />
            {t("status")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/about" onClick={onNavigate}>
            <Info className="mr-2 h-4 w-4" />
            {t("about")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/announcements" onClick={onNavigate}>
            <Megaphone className="mr-2 h-4 w-4" />
            {tAnnouncements("pageTitle")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
          {tLegal("title")}
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/legal/terms" onClick={onNavigate}>
            <FileText className="mr-2 h-4 w-4" />
            {tLegal("documents.terms.short")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/legal/privacy" onClick={onNavigate}>
            <Lock className="mr-2 h-4 w-4" />
            {tLegal("documents.privacy.short")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/legal/security" onClick={onNavigate}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            {tLegal("documents.security.short")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
