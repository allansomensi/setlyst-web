# Contributing to Setlyst Web

Thanks for your interest in contributing! Setlyst is an open-source platform for setlist management, and any help is genuinely appreciated — whether that's adding new frontend features, improving the UI/UX, testing the "Live Mode" on different mobile devices, or fixing bugs.

---

## Ways to Contribute 🛠️

- 🎨 **UI/UX & Design** — Improving responsiveness, accessibility, and the overall look and feel of the dashboard and live viewer.
- 📱 **Testing** — Running the application on different browsers and devices (especially mobile phones and tablets for stage use) and reporting issues.
- 💻 **Code** — Next.js React components, API integrations, state management, and bug fixes.
- 🌍 **Localization (i18n)** — Helping translate the application or improving existing English and Portuguese text.

---

## Before You Start 🚦

For anything beyond a small fix, **open an issue first**. This avoids duplicate work and allows for alignment on the approach before time is invested in a PR.

If you are planning to add a new major feature or alter the layout significantly, it is always a good idea to discuss the UX flow in the issue beforehand.

---

## Development Setup ⚙️

```bash
git clone [https://github.com/allansomensi/setlyst-web](https://github.com/allansomensi/setlyst-web)
cd setlyst-web
npm install
```

**Prerequisites:** Node.js (latest LTS recommended). You will also need the backend API running or a mock environment set up. 📦

Run the development server:

```node
npm run dev
```

Run linting and formatting:

```node
npm run lint:fix
```

## UI Components & Architecture 🏗️

Setlyst uses the Next.js App Router. When working on the frontend:

- 🧩 **Components:** We reuse UI components extensively (check components/ui/). If you are building a new feature, try to compose it using existing layout primitives before adding new custom CSS.

- 🎤 **Live Mode:** The Live Mode is a critical part of the application used by musicians on stage. Any changes here must strictly avoid layout shifts, ensure high contrast, and prevent accidental screen locks or navigation.

- ⚡ **Client vs Server:** Keep server components as the default. Only use "use client" directives when interactivity (hooks, event listeners) is strictly necessary.

## Pull Requests 🚀

- 🎯 Keep PRs focused — one feature or fix per PR.

- 🔗 Reference the related issue in the PR description (e.g., `closes #10` or `fixes #12`).

- ✅ Make sure local builds and linting pass.

- 📚 Update or add documentation/comments if your change affects complex logic or introduces new dependencies.

## Commit Style 📝

We strictly follow the [Conventional Commits](https://www.conventionalcommits.org) standard. The repository is configured with `commitlint` and `husky` to enforce this.

Commit messages must be in English and should be brief and descriptive.

## Legal ⚖️

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE). 📜
