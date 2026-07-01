"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
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
 * a phase with the on-screen arrow, ← / Esc. "esci dalla demo" leaves entirely
 * (back to the merge-designs list — `exitHref`).
 */
export function VortexExperience({ exitHref = "/graphic-designs" }) {
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

  const handleEnteringGalleryComplete = useCallback(() => setPhase("gallery"), []);

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
      if (e.key === "Escape" || e.key === "ArrowLeft" || e.key === "Backspace") {
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back]);

  const canGoBack = phase === "carousel" || phase === "gallery";

  return (
    <div className="vortex-stage">
      <div className="vortex-frame">
        <VortexScene
          phase={phase}
          selectedCardId={selectedCardId}
          onCardSelect={handleCardSelect}
          onCarouselImageClick={handleCarouselImageClick}
          onSelectionComplete={handleSelectionComplete}
          onReturnComplete={handleReturnComplete}
          onEnteringGalleryComplete={handleEnteringGalleryComplete}
          galleryBackground={galleryBackground}
          galleryImages={galleryImages}
          carouselImages={carouselImages}
          setCarouselImages={setCarouselImages}
          autoSelectImageId={null}
        />
      </div>

      <span className="vortex-title" aria-hidden="true">
        Image Vortex
      </span>

      <Link href={exitHref} className="vortex-exit">
        ✕ esci dalla demo
      </Link>

      {canGoBack && (
        <button type="button" className="vortex-back" onClick={back}>
          ← {phase === "gallery" ? "carousel" : "vortex"}
        </button>
      )}
    </div>
  );
}
