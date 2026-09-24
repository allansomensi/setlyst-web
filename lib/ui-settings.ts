/**
 * Account-level UI settings, persisted by the API in
 * `user_preferences.ui_settings` so they follow the person to every
 * device. The API treats the blob as opaque (it only guarantees a bounded
 * JSON object); this module owns its shape and defaults.
 *
 * Device-specific choices made on the fly (a quick toggle in Live Mode,
 * a page size picked in a table) still live on the device and take
 * precedence there; these settings are what every *new* device — or a
 * device that was reset — starts from.
 */

import {
  DEFAULT_PDF_OPTIONS,
  normalizePdfOptions,
  type PdfExportOptions,
} from "@/lib/pdf-export-options";

export const LIVE_FONT_FAMILIES = ["sans", "mono", "serif"] as const;
export type LiveFontFamily = (typeof LIVE_FONT_FAMILIES)[number];

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export interface LiveDefaults {
  /** Chords over the lyrics, or lyrics alone. */
  showChords: boolean;
  /** Section headings (Verse, Chorus…) and the chorus accent bar. */
  showSections: boolean;
  /** Pure black/white with stage-yellow chords. */
  highContrast: boolean;
  /** Whole song on one screen: auto-sized text, no scrolling. */
  fitToScreen: boolean;
  fontFamily: LiveFontFamily;
}

export interface ListSettings {
  pageSize: number;
}

export interface WhatsNewState {
  /** The newest release note the person has opened. */
  lastSeen: string | null;
}

export interface OnboardingState {
  /**
   * The "you're on a free Pro trial" welcome was dismissed. Kept on the
   * account (not the device) so it is shown once, not once per browser.
   */
  trialWelcomeSeen: boolean;
}

export interface UiSettings {
  live: LiveDefaults;
  pdf: PdfExportOptions;
  lists: ListSettings;
  whatsNew: WhatsNewState;
  onboarding: OnboardingState;
}

export const DEFAULT_LIVE: LiveDefaults = {
  // Most people reading Live Mode are singing, not playing: lyrics first,
  // chords one tap away. Sections stay on — they're how you find your
  // place in the song.
  showChords: false,
  showSections: true,
  highContrast: false,
  fitToScreen: false,
  fontFamily: "sans",
};

export const DEFAULT_UI_SETTINGS: UiSettings = {
  live: DEFAULT_LIVE,
  pdf: DEFAULT_PDF_OPTIONS,
  lists: { pageSize: DEFAULT_PAGE_SIZE },
  whatsNew: { lastSeen: null },
  onboarding: { trialWelcomeSeen: false },
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeLiveDefaults(raw: unknown): LiveDefaults {
  const source = record(raw);
  return {
    showChords: bool(source.showChords, DEFAULT_LIVE.showChords),
    showSections: bool(source.showSections, DEFAULT_LIVE.showSections),
    highContrast: bool(source.highContrast, DEFAULT_LIVE.highContrast),
    fitToScreen: bool(source.fitToScreen, DEFAULT_LIVE.fitToScreen),
    fontFamily: (LIVE_FONT_FAMILIES as readonly unknown[]).includes(
      source.fontFamily,
    )
      ? (source.fontFamily as LiveFontFamily)
      : DEFAULT_LIVE.fontFamily,
  };
}

/** Coerces any stored blob into a complete, valid settings object. */
export function normalizeUiSettings(raw: unknown): UiSettings {
  const source = record(raw);
  const lists = record(source.lists);
  const whatsNew = record(source.whatsNew);
  const onboarding = record(source.onboarding);

  return {
    live: normalizeLiveDefaults(source.live),
    pdf: normalizePdfOptions(source.pdf),
    lists: {
      pageSize: (PAGE_SIZE_OPTIONS as readonly unknown[]).includes(
        lists.pageSize,
      )
        ? (lists.pageSize as number)
        : DEFAULT_PAGE_SIZE,
    },
    whatsNew: {
      lastSeen:
        typeof whatsNew.lastSeen === "string" ? whatsNew.lastSeen : null,
    },
    onboarding: {
      trialWelcomeSeen: bool(onboarding.trialWelcomeSeen, false),
    },
  };
}

/** A partial update: each top-level section replaces the stored one. */
export type UiSettingsPatch = Partial<UiSettings>;
