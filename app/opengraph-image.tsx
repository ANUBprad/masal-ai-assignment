import { ImageResponse } from "next/og";

// File-based Open Graph image (next/og renders it to PNG at build time). Kept
// deliberately plain: the brand mark, the wordmark, and one honest line.
export const alt = "Masal AI — turn property inquiries into clear next steps";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#000000",
          color: "#f5f5f5",
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "#111111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <svg width="40" height="40" viewBox="0 0 32 32">
              <path d="M16 8.2 7.6 15.1V24h5.7v-5.1h5.4V24h5.7v-8.9z" fill="#8fbf9f" />
            </svg>
          </div>
          <div style={{ fontSize: "34px", fontWeight: 700, letterSpacing: "-0.02em" }}>masal.ai</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "56px", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            Turn property inquiries into clear next steps
          </div>
          <div style={{ fontSize: "28px", color: "#a3a3a3", lineHeight: 1.3 }}>
            Understand buyer requirements, prioritize follow-ups, and prepare better sales conversations.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
