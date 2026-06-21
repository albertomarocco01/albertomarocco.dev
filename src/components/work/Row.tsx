"use client";

import { useRef, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { Work } from "@/lib/work";
import type { WorkText } from "@/lib/i18n";
import { registerGsap, FIELD_EASE, TIMING } from "@/lib/motion";

// Lazy 3D: keeps three/r3f/drei out of the initial page chunk.
const GenAura = dynamic(
  () => import("@/components/canvas/GenAura").then((m) => m.GenAura),
  { ssr: false },
);

export interface RowHandlers {
  onEnter: () => void;
  onLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onClick: (e: MouseEvent) => void;
}

interface RowProps extends RowHandlers {
  work: Work;
  /** translatable copy (description, cue) for this row, from the dictionary */
  text: WorkText;
  isOpen: boolean;
  reducedMotion: boolean;
  /** field is mounted — safe to render the aura View */
  fieldReady: boolean;
}

export function Row({
  work,
  text,
  isOpen,
  reducedMotion,
  fieldReady,
  onEnter,
  onLeave,
  onFocus,
  onBlur,
  onClick,
}: RowProps) {
  const revealRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // GSAP owns the layout-affecting reveal (height) and the directional wipe
  // (clip-path via a CSS var) + opacity, synced to open state. CSS handles the
  // cheap micro-transitions (title shift, amber line, sibling dim).
  useGSAP(
    () => {
      registerGsap();
      const reveal = revealRef.current;
      const inner = innerRef.current;
      if (!reveal || !inner) return;

      if (isOpen) {
        const gap = parseFloat(getComputedStyle(inner).marginBottom) || 0;
        const target = inner.offsetHeight + gap;
        gsap.to(reveal, {
          height: target,
          duration: reducedMotion ? 0 : TIMING.reveal,
          ease: FIELD_EASE,
          overwrite: "auto",
        });
        gsap.to(inner, {
          opacity: 1,
          "--reveal-clip": 0,
          duration: reducedMotion ? 0 : 0.95,
          ease: FIELD_EASE,
          overwrite: "auto",
        });
      } else {
        gsap.to(reveal, {
          height: 0,
          duration: reducedMotion ? 0 : 0.6,
          ease: FIELD_EASE,
          overwrite: "auto",
        });
        gsap.to(inner, {
          opacity: 0,
          "--reveal-clip": 100,
          duration: reducedMotion ? 0 : 0.5,
          ease: FIELD_EASE,
          overwrite: "auto",
        });
      }
    },
    { dependencies: [isOpen, reducedMotion] },
  );

  const isGen = work.type === "gen";
  // A real, optimized capture of the live site (Vini Montarello). next/image
  // serves it lazily with a blur-up placeholder, sized to the reveal box (CLS 0),
  // with a "visit site" overlay making the preview read as the clickable link.
  const hasPreview = !isGen && !!work.image;

  const head = (
    <div className="row-head">
      <span className="row-idx">{work.index}</span>
      <span className="row-title">{work.title}</span>
      <span className="row-meta">
        {work.meta}
        <span className="arrow" aria-hidden="true">
          {isGen ? "→" : "↗"}
        </span>
      </span>
    </div>
  );

  const reveal = (
    <div className="row-reveal" ref={revealRef}>
      {isGen && fieldReady && !reducedMotion && (
        <GenAura
          sizeRef={revealRef}
          variant={work.variant}
          active={isOpen}
          reducedMotion={reducedMotion}
        />
      )}
      <div
        className={`reveal-inner${isGen ? " gen" : ""}${
          work.variant === "ember" ? " ember" : ""
        }`}
        ref={innerRef}
      >
        {hasPreview ? (
          <div className="reveal-media preview">
            <Image
              className="preview-img"
              src={work.image!}
              alt={work.imageAlt ?? `${work.title} — site preview`}
              fill
              sizes="(max-width: 720px) 92vw, (max-width: 1280px) 86vw, 1120px"
              placeholder="blur"
              draggable={false}
            />
            <span className="preview-cta">
              <span>{text.cue}</span>
              <span className="preview-arrow" aria-hidden="true">
                ↗
              </span>
            </span>
          </div>
        ) : (
          !isGen && (
            <div
              className="reveal-media"
              style={{ background: work.mediaGradient }}
              aria-hidden="true"
            />
          )
        )}
        <div className="reveal-caption">
          <span className="c-desc">{text.description}</span>
          {!hasPreview && <span className="c-cue">{text.cue}</span>}
        </div>
      </div>
    </div>
  );

  const className = `row${isOpen ? " open" : ""}`;
  const handlers = {
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    onFocus,
    onBlur,
  };

  if (work.type === "web" && work.href) {
    return (
      <a
        className={className}
        href={work.href}
        target={work.external ? "_blank" : undefined}
        rel={work.external ? "noopener noreferrer" : undefined}
        onClick={onClick}
        {...handlers}
      >
        {head}
        {reveal}
      </a>
    );
  }

  return (
    <button
      className={className}
      type="button"
      aria-expanded={isOpen}
      onClick={onClick}
      {...handlers}
    >
      {head}
      {reveal}
    </button>
  );
}
