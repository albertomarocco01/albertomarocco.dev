import { ImageResponse } from "next/og";

export const alt = "Alberto Marocco — Creative Technologist";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fetch Fraunces as TTF (Google serves truetype to unrecognised UAs, which is
// what Satori needs). Subsetted to the glyphs we render.
async function loadFraunces(text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300&text=${encodeURIComponent(
    text,
  )}`;
  const css = await (await fetch(url)).text();
  const src = css.match(
    /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/,
  )?.[1];
  if (!src) throw new Error("Could not resolve Fraunces font source");
  return (await fetch(src)).arrayBuffer();
}

export default async function Image() {
  const name = "Alberto Marocco";
  const eyebrow = "creative technologist · turin";
  const domain = "albertomarocco.dev";
  const font = await loadFraunces(`${name}${eyebrow}${domain}·.`);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "84px",
          background: "#0a0a0c",
          backgroundImage:
            "radial-gradient(900px 520px at 72% 118%, rgba(176,120,70,0.32), rgba(10,10,12,0) 60%)",
          color: "#c7c4bc",
          fontFamily: "Fraunces",
        }}
      >
        <div
          style={{
            fontSize: 27,
            letterSpacing: "0.32em",
            color: "#6d6a64",
            textTransform: "lowercase",
          }}
        >
          {eyebrow}
        </div>
        <div style={{ display: "flex", fontSize: 132, lineHeight: 1 }}>
          <span>{name}</span>
          <span style={{ color: "#b07846" }}>.</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 27,
            letterSpacing: "0.12em",
            color: "#6d6a64",
          }}
        >
          <span>{domain}</span>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 18,
              background: "#b07846",
            }}
          />
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Fraunces", data: font, weight: 300, style: "normal" }] },
  );
}
