import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { SITE_NAME } from "@/lib/seo";

export const alt = `${SITE_NAME} — Creative Technologist`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fraunces 300 as a TrueType file Satori can read, vendored once under
// src/assets/fonts/ and read from disk at module scope (the docs' own pattern):
// the previous version fetched the Google Fonts CSS at build time, regexed a
// TTF URL out of it and threw on a mismatch, so an offline build — or a change
// in Google's CSS — failed the whole build. The file is the same TTF Google
// served (`Fraunces:opsz,wght@9..144,300`), subset to printable ASCII plus the
// accented vowels and the · — – ’ marks, 25 KB. Add glyphs → re-subset it, the
// recipe is in DECISIONS ("OG image fonts").
const fraunces = await readFile(
  join(process.cwd(), "src/assets/fonts/fraunces-300-latin.ttf"),
);

export default async function Image() {
  const name = "Alberto Marocco";
  const eyebrow = "creative technologist · turin";
  // The domain spelling, lowercase, as an address (DECISIONS: brand spelling).
  const domain = "albertomarocco.dev";

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
    {
      ...size,
      fonts: [{ name: "Fraunces", data: fraunces, weight: 300, style: "normal" }],
    },
  );
}
