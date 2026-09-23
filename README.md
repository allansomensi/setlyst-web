<div align="center">
  <h1>Setlyst Web</h1>

  <p><em>A modern, stage-ready setlist management platform — built with Next.js and optimized for performance.</em></p>

[![Built with Next.js](https://img.shields.io/badge/built_with-Next.js-000000.svg?logo=next.js)](https://nextjs.org/)
[![Built with TypeScript](https://img.shields.io/badge/built_with-TypeScript-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

  <br/>
</div>

Setlyst Web is the frontend for the Setlyst ecosystem. It provides an intuitive dashboard for musicians to manage their song library, organize setlists, and access a high-performance **Live Mode** designed specifically for use on stage.

---

## 🎯 Motivation

Managing paper setlists or generic note apps during a concert is prone to error and lacks organization. Musicians need a dedicated tool that handles song structures, lyrics, and metadata, while providing a distraction-free interface when the lights go up.

Setlyst was built to be fast, responsive, and reliable enough for professional use.

---

## ✨ Features

> ⚠️ Setlyst is in active development.

- ✅ **Dashboard** — Centralized management of Artists, Songs, Bands, Setlists, and Gigs.
- ✅ **Live Mode** — High-contrast, distraction-free performance viewer with a built-in metronome and live transpose.
- ✅ **ChordPro Support** — Dynamic rendering and editing of lyrics and chords. Pasted charts with chords above the lyrics are aligned automatically, and section headings are recognised in English, Portuguese and Spanish.
- ✅ **Setlist Analytics** — Visualize a setlist's tempo/energy progression before you play it.
- ✅ **Authentication** — Secure access via NextAuth, with role-based access control.
- ✅ **Band Collaboration** — Multiple members share the same song library, setlists, and gigs.
- ✅ **Public Sharing** — Shareable, read-only links and QR codes for setlists and gigs.
- ✅ **Offline Support** — Setlists, songs, and Live Mode keep working with no signal.
- ✅ **Installable (PWA)** — Add Setlyst to your home screen like a native app.
- ✅ **PDF & ChordPro Export** — Generate printable setlists or export songs as `.cho` files.
- ✅ **Backup & Restore** — Export and import a full snapshot of your data.
- ✅ **Responsive Design** — Optimized for desktops, tablets, and mobile phones.
- ✅ **Multi-language** — Full support for English, Portuguese, and Spanish (i18n).
- ✅ **Tags** — Tag songs by vibe ("ballad", "opener"…), filter by tag and manage your tag vocabulary.
- ✅ **Customizable PDF** — Presets, compact and two-column layouts, text size, paper, margins, songbook with chords above the lyrics, optional watermark; save your favourite setup as the default.
- ✅ **Synced preferences** — Live Mode, list and PDF defaults follow you to every device.
- ✅ **Staff console** — Admins and moderators manage users (suspend, deactivate, temporary passwords, per-user limits, "view as"), bands, songs, setlists and public links, with a full audit log.
- ✅ **Strong account security** — Enforced password policy, username rules, instant sign-out on password change or suspension.
- ✅ **What's new, status page and legal texts** — Built in, in every language.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [Shadcn UI](https://ui.shadcn.com/)
- **Authentication:** [NextAuth.js](https://next-auth.js.org/)
- **Icons:** [Lucide React](https://lucide.dev/)

---

## 📥 Installation

**Prerequisites:** Node.js 20.9+ and a running instance of the [Setlyst API](https://github.com/allansomensi/setlyst-api).

1. **Clone the repository:**

   ```bash
   git clone [https://github.com/allansomensi/setlyst-web](https://github.com/allansomensi/setlyst-web)
   cd setlyst-web
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment:**

   Create a **.env.local** file based on **.env.example**:

   ```bash
   NEXT_PUBLIC_API_URL=your_api_url
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_secret_of_at_least_32_characters
   # Optional
   NEXT_PUBLIC_WIKI_URL=https://github.com/allansomensi/setlyst-web/wiki
   NEXT_PUBLIC_SUPPORT_EMAIL=support@example.com
   NEXT_PUBLIC_PRIVACY_EMAIL=privacy@example.com   # LGPD officer, defaults to the support e-mail
   NEXT_PUBLIC_BILLING_ENFORCED=false              # "true" once the API enforces billing
   NEXT_PUBLIC_COMPANY_NAME=                       # controller shown in the legal documents
   NEXT_PUBLIC_COMPANY_CNPJ=
   NEXT_PUBLIC_COMPANY_ADDRESS=
   INTERNAL_API_SECRET=                            # same value as the API's, see "Client address" below
   TRUSTED_PROXY_HOPS=1                            # reverse proxies in front of Next.js (self-hosted)
   TRUST_X_REAL_IP=false                           # "true" only if your proxy overwrites X-Real-IP
   NEXT_PUBLIC_ENABLE_SW_IN_DEV=false              # register the service worker in `npm run dev`
   ```

   **Client address.** With `INTERNAL_API_SECRET` set, the server tells the API who the visitor is so rate limits apply per visitor. On Vercel (`VERCEL` is set by the platform) the address comes from `x-vercel-forwarded-for`/`x-real-ip`. Self-hosted, it is the entry `TRUSTED_PROXY_HOPS` positions from the right of `X-Forwarded-For` (the address your closest reverse proxy appended; `0` disables it), or `X-Real-IP` when `TRUST_X_REAL_IP=true`. The leftmost `X-Forwarded-For` entry is written by the client and is never trusted; when nothing trustworthy is available no address is sent.

4. **Run the development server**

   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

5. **Checks**

   ```bash
   npm run typecheck   # TypeScript
   npm run lint        # ESLint + Prettier
   npm test            # Unit tests (Vitest)
   ```

> The legal texts (`lib/legal-content.ts`) describe how Setlyst stores and protects data. Review them for your jurisdiction (LGPD, GDPR…) before going to production. Release notes shown on the "What's new" page live in `lib/whats-new.ts`.

---

## 🎤 Live Mode

The **Live Mode** is the heart of Setlyst. It is designed to be used on tablets and smartphones mounted on mic stands. It features:

- **Zero Layout Shift:** Content remains stable during performance.
- **High Contrast:** Readable under stage lights or in dark venues.
- **Stay Awake:** Prevents the device from sleeping during use.
- **Metronome:** Per-song BPM, tap tempo, and an audible or visual click.
- **Live Transpose:** Shift the key on the fly, with capo suggestions.
- **Auto-scroll:** Hands-free lyric scrolling at an adjustable speed.
- **Compact Mode:** The whole song on one screen, in columns when there's room.
- **Swipe Navigation:** Swipe left/right on a phone to move through the setlist.
- **Lyrics First:** Chords and section headings can each be toggled, per device.
- **Offline-ready:** Works with no signal — nothing depends on a live connection once synced.

---

## 🤝 Contributing

Contributions are very welcome! Setlyst is a community-driven project, and we appreciate help with:

- 🐛 **Bug Fixes**: Identifying and fixing frontend or integration issues.
- ✨ **Feature Requests**: Suggesting and implementing new tools for musicians.
- 🎨 **UI/UX**: Improving the design, accessibility, and responsiveness.
- 🌍 **Translations**: Helping us reach more musicians by improving i18n support.

Please check our [CONTRIBUTING.md](./.github/CONTRIBUTING.md) for detailed guidelines on our development workflow and commit standards. 📜

---

## ⚖️ Legal

**Setlyst is an open-source project created by musicians for musicians. 🎸**

This project is not affiliated with, endorsed by, or sponsored by any instrument or software manufacturer. All product names, logos, and brands are property of their respective owners and are used here strictly for descriptive and nominative purposes.

Setlyst is released under the [MIT License](./LICENSE). 📜
