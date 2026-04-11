import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Wayport — SSH tunnels, managed.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #06080f 0%, #0e1320 50%, #06080f 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,148,76,0.08) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        <svg
          width="80"
          height="80"
          viewBox="0 0 32 32"
          fill="none"
          style={{ marginBottom: 32 }}
        >
          <circle cx="16" cy="16" r="14" stroke="#d4944c" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="9" stroke="#d4944c" strokeWidth="1" />
          <circle cx="16" cy="16" r="3.5" fill="#d4944c" />
          <line x1="16" y1="2" x2="16" y2="7" stroke="#d4944c" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16" y1="25" x2="16" y2="30" stroke="#d4944c" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="2" y1="16" x2="7" y2="16" stroke="#d4944c" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="25" y1="16" x2="30" y2="16" stroke="#d4944c" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#f0ece4",
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}
        >
          Wayport
        </div>

        <div
          style={{
            fontSize: 28,
            color: "#9a978f",
            maxWidth: 700,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          SSH tunnels, managed. Save connections, connect in one click, share with your team.
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 18,
            color: "#d4944c",
            letterSpacing: "0.05em",
          }}
        >
          wayport.dev
        </div>
      </div>
    ),
    { ...size }
  );
}
