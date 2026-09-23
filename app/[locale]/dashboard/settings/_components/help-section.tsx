import { getLocale, getTranslations } from "next-intl/server";
import {
  Activity,
  BookOpen,
  ExternalLink,
  FileText,
  LifeBuoy,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { getLegalText } from "@/lib/legal-content";
import {
  LEGAL_DOCUMENTS,
  STATUS_PATH,
  SUPPORT_EMAIL,
  WIKI_URL,
} from "@/lib/links";

interface Row {
  icon: LucideIcon;
  label: string;
  hint: string;
  href: string;
  external?: boolean;
  /** Outside the locale segment (plain anchor). */
  raw?: boolean;
}

function RowLink({ row }: { row: Row }) {
  const content = (
    <>
      <row.icon className="text-muted-foreground h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{row.label}</span>
        <span className="text-muted-foreground block truncate text-xs">
          {row.hint}
        </span>
      </span>
      {row.external && (
        <ExternalLink className="text-muted-foreground h-3.5 w-3.5" />
      )}
    </>
  );
  const className =
    "hover:bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors";

  if (row.external || row.raw) {
    return (
      <a
        href={row.href}
        className={className}
        {...(row.external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {content}
      </a>
    );
  }
  return (
    <Link href={row.href} className={className}>
      {content}
    </Link>
  );
}

/** Where to get help, what changed, and the legal texts. */
export async function HelpSection() {
  const t = await getTranslations("settings.help");
  const locale = await getLocale();

  const rows: Row[] = [
    {
      icon: BookOpen,
      label: t("wiki"),
      hint: t("wikiHint"),
      href: WIKI_URL,
      external: true,
    },
    {
      icon: Sparkles,
      label: t("whatsNew"),
      hint: t("whatsNewHint"),
      href: "/dashboard/whats-new",
    },
    {
      icon: Activity,
      label: t("status"),
      hint: t("statusHint"),
      href: STATUS_PATH,
      raw: true,
    },
    {
      icon: LifeBuoy,
      label: t("support"),
      hint: SUPPORT_EMAIL,
      href: `mailto:${SUPPORT_EMAIL}`,
      raw: true,
    },
    ...LEGAL_DOCUMENTS.map((doc) => {
      const text = getLegalText(doc, locale);
      return {
        icon: FileText,
        label: text.title,
        hint: text.summary,
        href: `/legal/${doc}`,
      };
    }),
  ];

  return (
    <Card>
      <CardContent className="grid gap-1 px-3 sm:grid-cols-2">
        {rows.map((row) => (
          <RowLink key={row.href} row={row} />
        ))}
      </CardContent>
    </Card>
  );
}
