import { cn } from "@/lib/utils";

/** Title block at the top of a public page (eyebrow, h1, lead). */
export function PageIntro({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <p className="text-primary mb-3 text-sm font-semibold tracking-wide">
          {eyebrow}
        </p>
      )}
      <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
        {title}
      </h1>
      {description && (
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed text-pretty">
          {description}
        </p>
      )}
      {children}
    </header>
  );
}
