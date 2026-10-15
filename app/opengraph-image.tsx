import { ImageResponse } from "next/og";

// File-based Open Graph image (next/og renders it to PNG at build time). Kept
// deliberately plain: the brand mark, the wordmark, and one honest line.
export const alt = "Masal AI — real-estate lead intelligence workspace";
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
          background: "#0e1512",
          color: "#e8efe9",
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "#14251d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <svg width="40" height="40" viewBox="0 0 32 32">
              <path d="M16 8.2 7.6 15.1V24h5.7v-5.1h5.4V24h5.7v-8.9z" fill="#d7f36a" />
            </svg>
          </div>
          <div style={{ fontSize: "34px", fontWeight: 700, letterSpacing: "-0.02em" }}>masal.ai</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "60px", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            Real-estate lead intelligence
          </div>
          <div style={{ fontSize: "30px", color: "#93a29a", lineHeight: 1.3 }}>
            Triage an enquiry into a prioritised lead with a next action and a ready-to-send reply.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
