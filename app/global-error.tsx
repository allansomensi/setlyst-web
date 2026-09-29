"use client";

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
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#0b0b0f",
          color: "#f4f4f5",
          textAlign: "center",
          padding: "16px",
        }}
      >
        <main style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Algo deu errado.</h1>
          <p style={{ margin: "0 0 4px", opacity: 0.8 }}>
            Something went wrong. · Algo salió mal.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, opacity: 0.6 }}>
              Ref: <code>{error.digest}</code>
            </p>
          )}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
              marginTop: 20,
            }}
          >
            {/* `retry()` refetches the server tree first: a bare `reset()`
                would just re-render the layout that failed. */}
            <button
              type="button"
              onClick={() => retry()}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "#f4f4f5",
                color: "#0b0b0f",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Tentar novamente · Try again
            </button>
            {/* A full reload on purpose: the app's router may be what broke. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid #3f3f46",
                color: "#f4f4f5",
                textDecoration: "none",
              }}
            >
              Início · Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
