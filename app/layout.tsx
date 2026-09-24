import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

// Inter is the UI face (`--font-sans`); Geist Mono is `--font-mono` (chords,
// BPM, keys). Geist Sans used to be loaded and preloaded too, unused.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * The origin social previews and other absolute URLs are resolved against.
 * `NEXTAUTH_URL` is already required for auth to work at all, so it is the
 * one base URL guaranteed to be configured; Vercel's own project URL is a
 * fallback for preview deployments, which don't set it.
 */
function getSiteUrl(): URL | undefined {
  const candidate =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);

  if (!candidate) return undefined;

  try {
    return new URL(candidate);
  } catch {
    return undefined;
  }
}

const APP_NAME = "Setlyst";
const APP_DESCRIPTION =
  "Your repertoire, setlists and gigs for musicians who play live, with a Live Mode that works offline.";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: "/manifest.json",
  // Sharing a setlist or a gig link is a core feature here — those links
  // get pasted into WhatsApp and band group chats, where a page with no
  // Open Graph tags renders as a bare, untitled URL.
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  // Lets iOS treat an added-to-home-screen Setlyst as a standalone app,
  // the way the web manifest already does on Android.
  //
  // Status bar: "default" on purpose. "black-translucent" draws the page
  // under the status bar with *white* text whatever the theme, so the
  // clock and battery vanish over the light theme (the default for most
  // people); iOS reads this once, at install, so it can't follow the
  // theme toggle. "default" gives an opaque bar iOS keeps legible; its
  // light strip over the dark theme is the lesser evil. Every top-level
  // surface (dashboard, Live Mode, public site header, auth screens,
  // share pages, toasts) already pads for env(safe-area-inset-*), so
  // switching to "black-translucent" is this one line if that trade-off
  // is ever preferred; the insets also cover notched phones in landscape.
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  // Matches the manifest's background/theme colour, so the browser chrome
  // doesn't flash white against the app's dark surfaces on launch.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  // Deliberately not locking zoom: Live Mode is read at arm's length on a
  // stand, and pinch-zoom is a real accessibility affordance there.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `<html lang>` has to be set here because this is the only layout that
  // renders the document shell — the public share routes (/s, /g) live
  // outside the `[locale]` segment and share it. Without it, screen
  // readers announce every page in the browser's default language, and
  // hyphenation and spellchecking pick the wrong rules.
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={cn(
        "h-full antialiased",
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
