import { ImageResponse } from "next/og";

export const alt = "Mark Reeve Consul — IT student and developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          color: "#f5f3f0",
          background: "radial-gradient(circle at 85% 15%, #27203b 0, #111217 42%, #090a0d 100%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#c5b6ff" }}>consul.dev</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 66, fontWeight: 700, letterSpacing: -2 }}>Mark Reeve Consul</div>
          <div style={{ display: "flex", fontSize: 30, color: "#c9c5d2" }}>IT student · Developer</div>
          <div style={{ display: "flex", marginTop: 12, fontSize: 25, color: "#aaa5b5" }}>
            Web apps, desktop tools, and learning projects
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 20, color: "#8f8b99" }}>
          Open to internships · collaborations · client work
        </div>
      </div>
    ),
    size,
  );
}
