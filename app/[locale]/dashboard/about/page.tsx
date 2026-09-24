import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { isStaffRole } from "@/lib/staff-permissions";
import {
  Activity,
  BookOpen,
  Briefcase,
  Bug,
  Camera,
  Clapperboard,
  ExternalLink,
  FileText,
  FolderGit2,
  GitCommitHorizontal,
  Globe,
  Heart,
  Monitor,
  Scale,
  Server,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/nav-link";
import { STATUS_PATH, WIKI_URL } from "@/lib/links";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/app-logo";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import packageJson from "@/package.json";
import {
  AUTHOR,
  AUTHOR_LINKS,
  REPOSITORIES,
  TECH_STACK,
  repoUrl,
  type RepositoryKind,
} from "@/lib/about";
import {
  emojifyGitmoji,
  getLatestCommit,
  type LatestCommit,
} from "@/lib/github";
import { getSession } from "@/lib/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return { title: t("title") };
}

const LINK_ICONS: Record<(typeof AUTHOR_LINKS)[number]["kind"], LucideIcon> = {
  github: FolderGit2,
  website: Globe,
  instagram: Camera,
  youtube: Clapperboard,
  linkedin: Briefcase,
};

const REPO_ICONS: Record<RepositoryKind, LucideIcon> = {
  web: Monitor,
  api: Server,
};

export default async function AboutPage() {
  const t = await getTranslations("about");
  const tNav = await getTranslations("nav");

  // The repositories and their latest commits (raw, English, with
  // gitmoji) are for the team; everyone else gets the version and the
  // changelog ("What's new").
  const session = await getSession();
  const isStaff = isStaffRole(session?.user?.role);
  const commits = isStaff
    ? await Promise.all(REPOSITORIES.map((repo) => getLatestCommit(repo.name)))
    : [];

  // Set by Vercel on every deployment: which commit this very build is.
  const deployedSha = process.env.VERCEL_GIT_COMMIT_SHA;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <PageBreadcrumbs
        items={[
          { label: tNav("home"), href: "/dashboard" },
          { label: t("title") },
        ]}
      />

      {/* Hero */}
      <section className="bg-card relative overflow-hidden rounded-2xl border p-6 sm:p-8">
        <div
          aria-hidden
          className="from-primary/15 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <AppLogo
              size={64}
              priority
              className="rounded-2xl shadow-lg shadow-black/20"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Setlyst
              </h1>
              <p className="text-muted-foreground text-sm">{t("tagline")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="h-7 px-2.5 font-mono">
              v{packageJson.version}
            </Badge>
            <Badge variant="outline" className="h-7 gap-1 px-2.5">
              <Scale className="h-3.5 w-3.5" />
              {t("license")}
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground relative mt-6 max-w-2xl leading-relaxed">
          {t("projectDescription")}
        </p>
        <p className="text-muted-foreground relative mt-3 max-w-2xl leading-relaxed">
          {t("openSource")}
        </p>
        <div className="relative mt-5 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={WIKI_URL} target="_blank" rel="noopener noreferrer">
              <BookOpen className="mr-1.5 h-4 w-4" />
              {t("links.wiki")}
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/whats-new">
              <Sparkles className="mr-1.5 h-4 w-4" />
              {t("links.whatsNew")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={STATUS_PATH}>
              <Activity className="mr-1.5 h-4 w-4" />
              {t("links.status")}
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/legal/privacy">
              <FileText className="mr-1.5 h-4 w-4" />
              {t("links.legal")}
            </Link>
          </Button>
        </div>
      </section>

      {/* Repositories + last commit (staff only) */}
      {isStaff && (
        <section className="space-y-3">
          <SectionTitle>{t("repositories")}</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {REPOSITORIES.map((repo, index) => (
              <RepositoryCard
                key={repo.name}
                name={repo.name}
                icon={REPO_ICONS[repo.kind]}
                description={t(`repo.${repo.kind}`)}
                stack={TECH_STACK[repo.kind]}
                commit={commits[index]}
                isDeployed={
                  repo.kind === "web" &&
                  !!deployedSha &&
                  commits[index]?.sha === deployedSha
                }
              />
            ))}
          </div>
          {deployedSha && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <GitCommitHorizontal className="h-3.5 w-3.5" />
              {t("deployedBuild")}{" "}
              <a
                href={`${repoUrl("setlyst-web")}/commit/${deployedSha}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground font-mono hover:underline"
              >
                {deployedSha.slice(0, 7)}
              </a>
            </p>
          )}
        </section>
      )}

      {/* Author */}
      <section className="space-y-3">
        <SectionTitle>{t("author")}</SectionTitle>
        <div className="bg-card flex flex-col gap-5 rounded-xl border p-5 sm:flex-row sm:items-start">
          <span className="bg-primary/10 text-primary flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold">
            {AUTHOR.initials}
          </span>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-lg font-semibold">{AUTHOR.name}</p>
              <p className="text-muted-foreground text-sm">{t("authorRole")}</p>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("authorBio")}
            </p>
            <div className="flex flex-wrap gap-2">
              {AUTHOR_LINKS.map((link) => {
                const Icon = LINK_ICONS[link.kind];
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:border-primary/40 hover:bg-accent/40 inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-colors"
                  >
                    <Icon className="text-primary h-4 w-4" />
                    {link.label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Contribute */}
      <section className="bg-muted/50 flex flex-col gap-4 rounded-xl border border-dashed p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Heart className="text-primary mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">{t("contributeTitle")}</p>
            <p className="text-muted-foreground text-sm">
              {t("contributeDescription")}
            </p>
          </div>
        </div>
        <a
          href={`${repoUrl("setlyst-web")}/issues/new`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-background hover:bg-muted inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors"
        >
          <Bug className="h-4 w-4" />
          {t("reportIssue")}
        </a>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
      {children}
    </h2>
  );
}

async function RepositoryCard({
  name,
  icon: Icon,
  description,
  stack,
  commit,
  isDeployed,
}: {
  name: string;
  icon: LucideIcon;
  description: string;
  stack: readonly string[];
  commit: LatestCommit | null;
  isDeployed: boolean;
}) {
  const t = await getTranslations("about");
  const format = await getFormatter();
  const now = new Date();

  return (
    <div className="bg-card flex flex-col rounded-xl border">
      <div className="flex-1 space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
              <Icon className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <a
                href={repoUrl(name)}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate font-mono text-sm font-semibold hover:underline"
              >
                {name}
              </a>
              <p className="text-muted-foreground truncate text-xs">
                {description}
              </p>
            </div>
          </div>
          <a
            href={repoUrl(name)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("openRepository", { name })}
            title={t("openRepository", { name })}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <div className="flex flex-wrap gap-1">
          {stack.map((tech) => (
            <span
              key={tech}
              className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[11px] font-medium"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-muted/40 border-t px-4 py-3">
        <p className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
          <GitCommitHorizontal className="h-3.5 w-3.5" />
          {t("lastCommit")}
          {isDeployed && (
            <span className="bg-primary/10 text-primary rounded px-1.5 py-px text-[10px] tracking-normal normal-case">
              {t("live")}
            </span>
          )}
        </p>
        {commit ? (
          <a
            href={commit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <p className="line-clamp-2 text-sm font-medium group-hover:underline">
              {emojifyGitmoji(commit.message)}
            </p>
            <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5 text-xs">
              <span className="text-foreground font-mono">
                {commit.shortSha}
              </span>
              {commit.authorName && (
                <>
                  <span aria-hidden>·</span>
                  <span>{commit.authorName}</span>
                </>
              )}
              {commit.date && (
                <>
                  <span aria-hidden>·</span>
                  <time
                    dateTime={commit.date}
                    title={format.dateTime(new Date(commit.date), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  >
                    {format.relativeTime(new Date(commit.date), now)}
                  </time>
                </>
              )}
            </p>
          </a>
        ) : (
          <p className="text-muted-foreground text-sm">
            {t("commitUnavailable")}
          </p>
        )}
      </div>
    </div>
  );
}
