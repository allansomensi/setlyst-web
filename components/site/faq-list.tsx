import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FaqItem {
  question: string;
  answer: React.ReactNode;
}

/**
 * Accordion of questions built on native `<details>`/`<summary>`: keyboard
 * and screen-reader support come from the browser, it works without
 * JavaScript and the answers are in the HTML for search engines.
 */
export function FaqList({
  items,
  className,
}: {
  items: FaqItem[];
  className?: string;
}) {
  return (
    <div className={cn("bg-card divide-y rounded-2xl border", className)}>
      {items.map((item) => (
        <details key={item.question} className="group px-5 sm:px-6">
          <summary className="focus-visible:ring-ring/50 flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-5 text-left font-medium outline-none focus-visible:ring-3 [&::-webkit-details-marker]:hidden">
            <span>{item.question}</span>
            <ChevronDown
              aria-hidden
              className="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="text-muted-foreground -mt-1 pb-5 leading-relaxed">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
