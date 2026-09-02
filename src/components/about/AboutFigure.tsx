"use client";

import dynamic from "next/dynamic";
import Image, { type StaticImageData } from "next/image";
import type { CSSProperties } from "react";
import { useApp } from "@/components/providers/AppProvider";

// Client-only, code-split: the GPU figure (and its three/drei imports) rides
// the same deferred path as the field — never in the page's first chunk.
const FigureView = dynamic(
  () => import("@/components/canvas/FigureView").then((m) => m.FigureView),
  { ssr: false },
);

/**
 * One cut-out photo on /about. The <img> is the figure: server-rendered, the
 * page's LCP element, toned and bottom-faded in CSS. Once the shared field is
 * allowed to exist (past first paint + idle, no reduced motion — the same gates
 * as FieldMount) a <View> mounts over it and the canvas takes the pixels over,
 * so the field's near orbs can pass in front of the person (FigureView.tsx).
 * Both load the same file, so the handover costs no second download.
 *
 * `--ar` is the photo's own aspect: the <figure> is sized from height alone and
 * the box, the <img> and the GPU plane all share one rectangle. `--fig-fade`
 * is the bottom dissolve for the <img> mask; `bottom` is the same number for
 * the shader.
 */
export function AboutFigure({
  image,
  alt,
  bottom = 0.08,
  preload = false,
}: {
  image: StaticImageData;
  alt: string;
  /** dissolve the bottom this fraction of the box into the void */
  bottom?: number;
  /** above the fold on load — preload the file (the first panel's figure) */
  preload?: boolean;
}) {
  const { fieldReady, reducedMotion } = useApp();
  const style = {
    "--ar": `${image.width} / ${image.height}`,
    "--fig-fade": `${Math.round(bottom * 100)}%`,
  } as CSSProperties;
  return (
    <figure className="about-figure" style={style}>
      {/* `unoptimized`: the cut-out is a lossy WebP-with-alpha authored at the
          size it is drawn at (reference/AboutPhotos/cutout.py), and the GPU
          texture wants that exact file — one URL, one download, cache-shared. */}
      <Image
        className="about-figure-img"
        src={image}
        alt={alt}
        fill
        unoptimized
        preload={preload}
        draggable={false}
      />
      {fieldReady && !reducedMotion && (
        <FigureView src={image.src} bottom={bottom} />
      )}
    </figure>
  );
}
