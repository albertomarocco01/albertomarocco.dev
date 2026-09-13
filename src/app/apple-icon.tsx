import { ImageResponse } from "next/og";

// The home-screen icon iOS asks for (`apple-touch-icon`, 180 px PNG — Safari
// ignores SVG here). The same mark as icon.svg, scaled ×5.625 from its 32-unit
// grid: the void as ground, the amber ring at 72 %, the amber dot. No rounded
// corners of its own — iOS masks the tile itself. Generated at build, cached.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const AMBER = "#b07846";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0c",
        }}
      >
        {/* r 9 + half the 1.5 stroke → outer diameter 19.5 units = 110 px */}
        <div
          style={{
            position: "absolute",
            width: 110,
            height: 110,
            borderRadius: 55,
            border: `8px solid ${AMBER}`,
            opacity: 0.72,
          }}
        />
        {/* r 2.6 units → 29 px */}
        <div
          style={{
            width: 29,
            height: 29,
            borderRadius: 15,
            background: AMBER,
          }}
        />
      </div>
    ),
    size,
  );
}
