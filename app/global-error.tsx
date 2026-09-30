"use client";

/**
 * Plain styles for the last-resort screen: it replaces the whole document,
 * so the app's stylesheet may be what failed. Follows the system theme
 * (the app's own theme setting is out of reach here) and uses the brand
 * indigo of the rest of Setlyst for the main action.
 */
const STYLES = `
  :root { color-scheme: light dark; }
  body {
    margin: 0;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    text-align: center;
    background: #f3f3f9;
    color: #18181b;
  }
  .ge-main { max-width: 420px; }
  .ge-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 20px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }
  .ge-title { font-size: 22px; line-height: 1.3; margin: 0 0 8px; }
  .ge-text { margin: 0 0 4px; color: #52525b; line-height: 1.5; }
  .ge-ref { margin: 12px 0 0; font-size: 12px; color: #71717a; }
  .ge-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 24px;
  }
  .ge-button {
    min-height: 40px;
    padding: 0 18px;
    border-radius: 10px;
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    text-decoration: none;
  }
  .ge-primary { border: none; background: #4f46e5; color: #fff; }
  .ge-secondary {
    border: 1px solid #d4d4d8;
    background: transparent;
    color: inherit;
  }
  .ge-button:focus-visible { outline: 3px solid rgba(79, 70, 229, 0.45); outline-offset: 2px; }
  @media (prefers-color-scheme: dark) {
    body { background: #12121a; color: #f4f4f5; }
    .ge-text { color: #a1a1aa; }
    .ge-ref { color: #a1a1aa; }
    .ge-icon { background: rgba(248, 113, 113, 0.12); color: #f87171; }
    .ge-primary { background: #8b8cf6; color: #12121a; }
    .ge-secondary { border-color: #3f3f46; }
  }
`;

/**
 * Last-resort crash screen, used when the root layout itself fails. It
 * replaces the whole document, so it can't rely on the app's providers,
 * translations or styles: plain markup, in the three languages.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Setlyst · Erro / Error</title>
        <style>{STYLES}</style>
      </head>
      <body>
        <main className="ge-main">
          <div className="ge-icon" aria-hidden>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <h1 className="ge-title">Algo deu errado.</h1>
          <p className="ge-text">Something went wrong. · Algo salió mal.</p>
          {error.digest && (
            <p className="ge-ref">
              Ref: <code>{error.digest}</code>
            </p>
          )}
          <div className="ge-actions">
            {/* `retry()` refetches the server tree first: a bare `reset()`
                would just re-render the layout that failed. */}
            <button
              type="button"
              onClick={() => retry()}
              className="ge-button ge-primary"
            >
              Tentar novamente · Try again
            </button>
            {/* A full reload on purpose: the app's router may be what broke. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="ge-button ge-secondary">
              Início · Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
