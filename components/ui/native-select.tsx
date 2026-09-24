import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A styled native `<select>`: same look as `Input`, with the platform's
 * own picker (a wheel on iOS, a sheet on Android), which beats a custom
 * popover inside a dialog on a phone. Use `Select` (Radix) when options
 * need icons or rich content. 40px tall on a coarse pointer, like Button.
 *
 *     <NativeSelect id="artist" value={id} onChange={(e) => setId(e.target.value)}>
 *       <option value="">{t("none")}</option>
 *       ...
 *     </NativeSelect>
 */
function NativeSelect({
  className,
  wrapperClassName,
  ...props
}: React.ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <div
      data-slot="native-select-wrapper"
      className={cn("relative w-full", wrapperClassName)}
    >
      <select
        data-slot="native-select"
        className={cn(
          "border-input text-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40 h-8 w-full min-w-0 appearance-none rounded-lg border bg-transparent py-1 pr-8 pl-2.5 text-base transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm pointer-coarse:min-h-10",
          // Options render in the OS picker; keep them readable in dark mode.
          "[&>option]:bg-popover [&>option]:text-popover-foreground",
          className,
        )}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
      />
    </div>
  );
}

export { NativeSelect };
