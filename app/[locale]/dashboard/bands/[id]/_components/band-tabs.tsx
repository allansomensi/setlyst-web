"use client";

import { useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface BandTab {
  value: string;
  label: string;
  /** Small count next to the label. */
  count?: number;
  content: ReactNode;
}

/**
 * The band page sections as tabs. The open tab lives in `?tab=`, so a
 * reload or a shared link keeps it.
 */
export function BandTabs({
  tabs,
  initial,
  label,
}: {
  tabs: BandTab[];
  initial: string;
  label: string;
}) {
  const [value, setValue] = useState(
    tabs.some((tab) => tab.value === initial) ? initial : tabs[0].value,
  );

  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        setValue(next);
        const url = new URL(window.location.href);
        if (next === tabs[0].value) url.searchParams.delete("tab");
        else url.searchParams.set("tab", next);
        window.history.replaceState(window.history.state, "", url);
      }}
      className="gap-6"
    >
      <TabsList
        aria-label={label}
        className="h-10 w-full justify-start sm:w-fit"
      >
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="px-3">
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="bg-primary/15 text-primary rounded-full px-1.5 text-[11px] leading-4 font-semibold tabular-nums">
                {tab.count}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="space-y-6">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
