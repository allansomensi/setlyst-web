"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { setLiveAccountDefaults } from "@/hooks/use-live-display-prefs";
import { setPageSizeAccountDefault } from "@/hooks/use-page-size";
import {
  DEFAULT_UI_SETTINGS,
  type UiSettings,
  type UiSettingsPatch,
} from "@/lib/ui-settings";
import { saveUiSettings } from "@/lib/actions/ui-settings";
import type { ActionResult } from "@/lib/action-guard";

interface UiSettingsContextValue {
  settings: UiSettings;
  /**
   * Applies `patch` immediately and persists it on the account. Resolves
   * with the server result; on failure the previous value is restored.
   */
  update: (patch: UiSettingsPatch) => Promise<ActionResult<unknown>>;
}

const UiSettingsContext = createContext<UiSettingsContextValue>({
  settings: DEFAULT_UI_SETTINGS,
  update: async () => ({ success: true }),
});

/**
 * Makes the account's saved UI settings (lib/ui-settings.ts) available to
 * every client component of the dashboard, and installs the account-level
 * defaults into the device-level hooks (Live Mode display, page size).
 */
export function UiSettingsProvider({
  initial,
  children,
}: {
  initial: UiSettings;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<UiSettings>(initial);
  const latest = useRef(settings);

  useEffect(() => {
    latest.current = settings;
    setLiveAccountDefaults(settings.live);
    setPageSizeAccountDefault(settings.lists.pageSize);
  }, [settings]);

  const update = useCallback(async (patch: UiSettingsPatch) => {
    const previous = latest.current;
    const next = { ...previous, ...patch };
    latest.current = next;
    setSettings(next);

    const result = await saveUiSettings(patch);
    if (!result.success) {
      latest.current = previous;
      setSettings(previous);
    }
    return result;
  }, []);

  const value = useMemo(() => ({ settings, update }), [settings, update]);

  return (
    <UiSettingsContext.Provider value={value}>
      {children}
    </UiSettingsContext.Provider>
  );
}

export function useUiSettings() {
  return useContext(UiSettingsContext);
}
