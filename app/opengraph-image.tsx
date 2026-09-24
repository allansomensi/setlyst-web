import { ImageResponse } from "next/og";

/**
 * The link preview (WhatsApp, band group chats, social networks) for
 * every page without its own: brand, name and what Setlyst is for. Drawn
 * with plain shapes and the default font, so it renders without fetching
 * anything.
 */
export const alt =
  "Setlyst: your repertoire, setlists and shows, ready for the stage";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background:
          "linear-gradient(135deg, #0b0a14 0%, #1b1440 60%, #2d1f6e 100%)",
        color: "#f5f3ff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: "#7c5cff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
            fontWeight: 700,
          }}
        >
          S
        </div>
        <div style={{ fontSize: 44, fontWeight: 700 }}>Setlyst</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: 960,
          }}
        >
          Seu repertório e suas setlists, prontos para o palco
        </div>
        <div style={{ fontSize: 32, color: "#c4b5fd" }}>
          Modo Ao Vivo · BPM e energia · Bandas · Offline
        </div>
      </div>
      <div style={{ fontSize: 26, color: "#a1a1aa" }}>setlyst.com.br</div>
    </div>,
    size,
  );
}
