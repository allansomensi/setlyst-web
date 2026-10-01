import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_PATH } from "@/lib/links";
import {
  INCIDENT_IMPACT_TONES,
  INCIDENT_STATUS_TONES,
} from "@/lib/platform-admin";
import { cn } from "@/lib/utils";
import type {
  IncidentComponent,
  IncidentImpact,
  IncidentKind,
  IncidentStatus,
} from "@/types/operations";

/*
 * Labels shared by the incident list and detail pages. Hook-only (no
 * `async`), so they render from server pages and client components alike.
 */

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const t = useTranslations("incidentsAdmin");
  return (
    <Badge variant="outline" className={INCIDENT_STATUS_TONES[status]}>
      {t(`statuses.${status}`)}
    </Badge>
  );
}

export function IncidentImpactBadge({ impact }: { impact: IncidentImpact }) {
  const t = useTranslations("incidentsAdmin");
  return (
    <Badge variant="outline" className={INCIDENT_IMPACT_TONES[impact]}>
      {t("impactLabel", { impact: t(`impacts.${impact}`) })}
    </Badge>
  );
}

export function IncidentKindBadge({ kind }: { kind: IncidentKind }) {
  const t = useTranslations("incidentsAdmin");
  return (
    <Badge variant={kind === "maintenance" ? "secondary" : "outline"}>
      {t(`kinds.${kind}`)}
    </Badge>
  );
}

export function IncidentComponents({
  components,
  className,
}: {
  components: IncidentComponent[];
  className?: string;
}) {
  const t = useTranslations("incidentsAdmin");
  return (
    <span className={cn("text-muted-foreground text-xs", className)}>
      {components.length === 0
        ? t("noComponents")
        : components.map((c) => t(`components.${c}`)).join(", ")}
    </span>
  );
}

/**
 * The public status page, in a new tab. A plain `<a>`: `/status` lives
 * outside the `[locale]` segment.
 */
export function StatusPageLink() {
  const t = useTranslations("incidentsAdmin");
  return (
    <Button asChild variant="outline">
      <a href={STATUS_PATH} target="_blank" rel="noopener">
        <ExternalLink aria-hidden />
        {t("viewStatusPage")}
        <span className="sr-only"> ({t("opensInNewTab")})</span>
      </a>
    </Button>
  );
}
