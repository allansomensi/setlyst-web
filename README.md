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

> ⚠️ Setlyst is in active development. Features marked 🚧 are planned but not yet implemented.

- ✅ **Dashboard** — Centralized management of Artists, Songs, and Setlists.
- ✅ **Live Mode** — High-contrast, distraction-free performance viewer.
- ✅ **ChordPro Support** — Dynamic rendering of lyrics and chords.
- ✅ **Authentication** — Secure access via NextAuth.
- ✅ **Responsive Design** — Optimized for desktops, tablets, and mobile phones.
- 🚧 **Multi-language** — Full support for English and Portuguese (i18n).
- 🚧 **Offline Support** — Access your setlists even without an internet connection.
- 🚧 **PDF Export** — Generate printable versions of your setlists.
- 🚧 **Setlist Sharing** — Collaborative editing with band members.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [Shadcn UI](https://ui.shadcn.com/)
- **Authentication:** [NextAuth.js](https://next-auth.js.org/)
- **Icons:** [Lucide React](https://lucide.dev/)

---

## 📥 Installation

**Prerequisites:** Node.js 18+ and a running instance of the [Setlyst API](https://github.com/allansomensi/setlyst-api).

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
   NEXTAUTH_SECRET=your_secret
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

---

## 🎤 Live Mode

The **Live Mode** is the heart of Setlyst. It is designed to be used on tablets and smartphones mounted on mic stands. It features:

- **Zero Layout Shift:** Content remains stable during performance.
- **High Contrast:** Readable under stage lights or in dark venues.
- **Stay Awake:** Prevents the device from sleeping during use.

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
