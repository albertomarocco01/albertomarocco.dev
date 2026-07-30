"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader } from "@react-three/drei";
import { VortexScene } from "./components/VortexScene.jsx";

/**
 * VortexExperience — web port of the kiosk "Vortice di Immagini" (App 1).
 *
 * The original was a 3-app installation (display + tablet companion + socket.io
 * bridge). For the web we keep ONLY the local state machine: the socket sync and
 * the tablet-driven handlers are dropped — every transition is driven by direct
 * mouse/touch interaction.
 *
 * Controls: click a vortex card → carousel → click an image → gallery. Step back
 * a phase with the on-screen arrow, ← / Esc. The exit link leaves entirely
 * (back to the merge-designs list — `exitHref`).
 *
 * `copy` is the active locale's strings (see ../../app/(immersive)/xperiments/
 * vortex/copy.ts), resolved on the server and handed down through VortexClient —
 * this whole tree is `ssr: false`, so it can't read the cookie itself.
 */
export function VortexExperience({ copy, exitHref = "/graphic-designs" }) {
  const router = useRouter();
  const [phase, setPhase] = useState("idle");
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [galleryBackground, setGalleryBackground] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [carouselImages, setCarouselImages] = useState([]);

  // Mirror phase into a ref so the stable callbacks below (passed into the three
  // scene) read the latest phase without being re-created on every transition.
  // Synced in an effect — all reads happen in handlers/keydown, after commit.
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ── Scene 1: vortex card clicked ───────────────────────────────────────────
  const handleCardSelect = useCallback((cardId) => {
    if (phaseRef.current !== "idle") return;
    setSelectedCardId(cardId);
    setPhase("selecting");
  }, []);

  const handleSelectionComplete = useCallback(() => setPhase("carousel"), []);

  // ── Scene 2: carousel item clicked ─────────────────────────────────────────
  const handleCarouselImageClick = useCallback(
    (imageData, _clickedIdx, allCarouselImages) => {
      if (phaseRef.current !== "carousel") return;
      setGalleryBackground(imageData);
      const allImages = allCarouselImages.map((c) => c.imageData);
      setGalleryImages(allImages);
      setCarouselImages(allImages);
      setPhase("gallery");
    },
    [],
  );

  // ── Back navigation (replaces the tablet's force_return) ───────────────────
  const handleReturnComplete = useCallback(() => {
    setSelectedCardId(null);
    setPhase("idle");
  }, []);

  const back = useCallback(() => {
    const cur = phaseRef.current;
    if (cur === "gallery") {
      setGalleryBackground(null);
      setGalleryImages([]);
      setPhase("carousel");
    } else if (cur === "carousel") {
      setPhase("returning");
    }
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      // Enter/Space from idle opens the carousel (keyboard path into the flow).
      // Carousel/gallery keys are handled inside CarouselRing (it owns activeIndex).
      // Don't hijack the keys when the exit/back chrome is focused.
      if (e.key === "Enter" || e.key === " ") {
        if (phaseRef.current === "idle" && !e.target.closest?.("a, button")) {
          e.preventDefault();
          // First vortex card is always id "0-0" (layer 0, card 0 always exists).
          handleCardSelect("0-0");
        }
        return;
      }
      if (e.key === "Escape" && phaseRef.current === "idle") {
        router.push(exitHref); // keyboard exit from the top of the flow
        return;
      }
      if (e.key === "Escape" || e.key === "ArrowLeft" || e.key === "Backspace") {
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back, handleCardSelect, router, exitHref]);

  const canGoBack = phase === "carousel" || phase === "gallery";

  return (
    <div className="vortex-stage">
      <div
        className="vortex-frame"
        role="application"
        aria-label={copy.aria}
      >
        <VortexScene
          copy={copy}
          phase={phase}
          selectedCardId={selectedCardId}
          onCardSelect={handleCardSelect}
          onCarouselImageClick={handleCarouselImageClick}
          onSelectionComplete={handleSelectionComplete}
          onReturnComplete={handleReturnComplete}
          galleryBackground={galleryBackground}
          galleryImages={galleryImages}
          carouselImages={carouselImages}
          setCarouselImages={setCarouselImages}
        />
      </div>

      <span className="vortex-title" aria-hidden="true">
        Image Vortex
      </span>

      <Link href={exitHref} className="vortex-exit">
        {copy.exit}
      </Link>

      {canGoBack && (
        <button type="button" className="vortex-back" onClick={back}>
          {phase === "gallery" ? copy.backToCarousel : copy.backToVortex}
        </button>
      )}

      {/* Progress overlay while the 54 textures load (replaces the black screen). */}
      <Loader
        containerStyles={{ background: "#000" }}
        dataInterpolation={(p) => copy.loading.replace("{p}", p.toFixed(0))}
      />
    </div>
  );
}
