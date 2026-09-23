import { Fragment } from "react";

/**
 * Renders a legal clause, turning e-mail addresses into `mailto:` links
 * and highlighting unfilled placeholders such as `[CNPJ]`, so they stand
 * out until the owner configures them.
 */
const TOKEN = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+|\[[A-ZÀ-Ú][A-ZÀ-Ú ]*\])/g;

export function LegalRichText({ text }: { text: string }) {
  const parts = text.split(TOKEN);
  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 0) return <Fragment key={index}>{part}</Fragment>;
        if (part.startsWith("[")) {
          return (
            <mark
              key={index}
              className="rounded bg-amber-200/60 px-1 text-inherit dark:bg-amber-400/25"
            >
              {part}
            </mark>
          );
        }
        return (
          <a
            key={index}
            href={`mailto:${part.replace(/\.$/, "")}`}
            className="text-primary font-medium break-all underline-offset-4 hover:underline"
          >
            {part}
          </a>
        );
      })}
    </>
  );
}
