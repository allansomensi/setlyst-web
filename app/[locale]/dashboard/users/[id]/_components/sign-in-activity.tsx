import { getLocale, getTimeZone, getTranslations } from "next-intl/server";
import { KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isKnownSignInMethod, signInMethodParts } from "@/lib/console";
import { formatApiDateTime } from "@/lib/dates";
import type { SignInEvent } from "@/types/operations";

/** Rows shown before the rest fold under "Show all". */
const VISIBLE = 10;

const OUTCOME_VARIANT = {
  succeeded: "secondary",
  failed: "outline",
  locked: "destructive",
} as const;

/**
 * The account's sign-ins, failed attempts and lockouts of the last 90
 * days (newest first), with the network address they came from: admins
 * only (`GET /admin/users/{id}/sign-ins`), for checking a report of
 * access the owner doesn't recognize.
 */
export async function SignInActivity({
  events,
}: {
  /** Null when they couldn't be loaded. */
  events: SignInEvent[] | null;
}) {
  const t = await getTranslations("userNotes.signIns");
  const locale = await getLocale();
  const timeZone = await getTimeZone();

  const method = (event: SignInEvent) => {
    const parts = signInMethodParts(event.method);
    if (parts.length === 0) return "—";
    return parts
      .map((part) => (isKnownSignInMethod(part) ? t(`methods.${part}`) : part))
      .join(" + ");
  };

  const row = (event: SignInEvent, index: number) => (
    <TableRow key={`${event.created_at}-${index}`}>
      <TableCell>
        <Badge variant={OUTCOME_VARIANT[event.outcome] ?? "outline"}>
          {t(`outcomes.${event.outcome}`)}
        </Badge>
        {event.second_factor && event.outcome !== "succeeded" && (
          <span className="text-muted-foreground mt-1 block text-xs">
            {t("secondFactor")}
          </span>
        )}
      </TableCell>
      <TableCell className="text-sm">
        {event.outcome === "succeeded" ? method(event) : "—"}
      </TableCell>
      <TableCell className="hidden font-mono text-xs sm:table-cell">
        {event.ip_address ?? "—"}
      </TableCell>
      <TableCell className="text-muted-foreground text-right text-sm whitespace-nowrap">
        {formatApiDateTime(event.created_at, locale, timeZone)}
        {event.ip_address && (
          <span className="block font-mono text-xs sm:hidden">
            {event.ip_address}
          </span>
        )}
      </TableCell>
    </TableRow>
  );

  const head = (
    <TableHeader>
      <TableRow>
        <TableHead>{t("columns.outcome")}</TableHead>
        <TableHead>{t("columns.method")}</TableHead>
        <TableHead className="hidden sm:table-cell">
          {t("columns.ip")}
        </TableHead>
        <TableHead className="text-right">{t("columns.date")}</TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="text-muted-foreground size-4" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {events === null ? (
          <p className="text-muted-foreground text-sm">{t("loadFailed")}</p>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <div className="space-y-2">
            <Table>
              {head}
              <TableBody>{events.slice(0, VISIBLE).map(row)}</TableBody>
            </Table>
            {events.length > VISIBLE && (
              <details className="group">
                <summary className="text-primary cursor-pointer rounded-sm text-sm font-medium underline-offset-4 hover:underline">
                  {t("showMore", { count: events.length - VISIBLE })}
                </summary>
                <Table className="mt-2">
                  {head}
                  <TableBody>
                    {events
                      .slice(VISIBLE)
                      .map((event, index) => row(event, index + VISIBLE))}
                  </TableBody>
                </Table>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
