import React, { useMemo, useRef, useEffect, useLayoutEffect, createRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { SCENE_CONFIG } from '../config/scene.config.js';
import { IMAGES } from '../data/images.js';
import { VortexCard } from './VortexCard.jsx';
import { getClampedSize } from '../utils/cardUtils.js';

// ── Deterministic seeded PRNG (Mulberry32) ──
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shared reusable Vector3 for worldToLocal conversions (avoids GC pressure)
const _tmpVec = new THREE.Vector3();

/**
 * CylinderLayer — one concentric cylinder that rotates independently.
 * Instantly stops when phase is not "idle" so that worldToLocal calculations
 * in the selection animation are accurate (no ongoing rotation drift).
 */
function CylinderLayer({ layer, cards, phase, onCardClick }) {
  const groupRef = useRef();
  const speed = SCENE_CONFIG.rings.idle.speeds[layer.index] || 0.04;
  const currentSpeed = useRef(speed);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (phase !== 'idle') {
      // Instant freeze — rotation.y stays fixed so worldToLocal stays valid
      currentSpeed.current = 0;
      return;
    }

    currentSpeed.current += (speed - currentSpeed.current) * Math.min(delta * 3, 1);
    if (Math.abs(currentSpeed.current) > 0.0001) {
      groupRef.current.rotation.y += currentSpeed.current * delta;
    }
  });

  return (
    <group ref={groupRef} name={`Cylinder-${layer.index}`}>
      {cards.map((card) => (
        <VortexCard
          key={card.id}
          imageData={card.imageData}
          position={card.position}
          rotation={card.rotation}
          ringRadius={card.ringRadius}
          cardWidth={card.cardWidth}
          cardHeight={card.cardHeight}
          phase={phase}
          outerGroupRef={card.outerGroupRef}
          animGroupRef={card.animGroupRef}
          meshRef={card.meshRef}
          materialRef={card.materialRef}
          onCardClick={phase === 'idle' ? () => onCardClick(card.id) : undefined}
        />
      ))}
    </group>
  );
}

/**
 * CarouselRing — il carosello circolare della Scena 2.
 *
 * The 8 selected vortex cards have already physically flown to the ring positions
 * during the 'selecting' phase. So when this ring becomes visible (phase='carousel'),
 * its cards appear directly at their final ring positions — no intro fly-in needed.
 * Rotation starts immediately.
 */
function CarouselRing({ images, phase, onCarouselImageClick }) {
  const groupRef = useRef();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const rotationTweenRef = useRef(null);
  const carouselConfig = SCENE_CONFIG.carousel;

  const selectedCards = useMemo(() => {
    return images.map((img, i) => {
      const { width, height } = getClampedSize(img.w / img.h, SCENE_CONFIG.cards.baseWidth, SCENE_CONFIG.cards);
      return {
        id: `carousel-${i}`,
        imageData: img,
        cardWidth: width,
        cardHeight: height,
      };
    });
  }, [images]);

  const cardRefs = useMemo(
    () => selectedCards.map(() => ({ 
      outerGroupRef: createRef(), 
      animGroupRef:  createRef(),
      materialRef:   createRef() 
    })),
    [selectedCards.length]
  );

  const carouselData = useMemo(() => {
    const count = selectedCards.length;
    const r = carouselConfig.radius;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const pos = [r * Math.sin(angle), carouselConfig.baseY, r * Math.cos(angle)];
      return { position: pos, rotation: [0, angle, 0], angle };
    });
  }, [selectedCards.length, carouselConfig.radius, carouselConfig.baseY]);

  // ── Selettore: Ruota l'intero anello per portare activeIndex davanti ──
  useLayoutEffect(() => {
    if (phase !== 'carousel' || !groupRef.current) return;

    const count = selectedCards.length;
    if (count === 0) return;

    // Angolo target per la card attiva: deve trovarsi a 0 radianti nel sistema mondo
    const targetRotY = -(activeIndex / count) * Math.PI * 2;

    if (rotationTweenRef.current) rotationTweenRef.current.kill();

    const currentRotY = groupRef.current.rotation.y;
    let diff = (targetRotY - currentRotY) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;

    rotationTweenRef.current = gsap.to(groupRef.current.rotation, {
      y: currentRotY + diff,
      duration: carouselConfig.selectorDuration,
      ease: carouselConfig.selectorEase,
    });
  }, [activeIndex, phase, selectedCards.length, carouselConfig]);

  // ── Highlight: Muove la card attiva più vicino e la ingrandisce ──
  useEffect(() => {
    if (phase !== 'carousel') return;

    selectedCards.forEach((_, i) => {
      const refs = cardRefs[i];
      if (!refs?.animGroupRef.current) return;

      const isActive = (i === activeIndex);
      const targetZ = isActive ? carouselConfig.activeCardOffsetZ : 0;
      const targetS = isActive ? carouselConfig.activeCardScale : 1;

      gsap.to(refs.animGroupRef.current.position, {
        z: targetZ,
        duration: carouselConfig.selectorDuration,
        ease: carouselConfig.selectorEase,
      });
      gsap.to(refs.animGroupRef.current.scale, {
        x: targetS, y: targetS, z: targetS,
        duration: carouselConfig.selectorDuration,
        ease: carouselConfig.selectorEase,
      });
    });
  }, [activeIndex, phase, selectedCards, carouselConfig, cardRefs]);

  // ── Auto-Play: Passa alla card successiva ogni 2 secondi ──
  useEffect(() => {
    if (phase !== 'carousel' || !carouselConfig.autoPlayDelay) return;

    const timer = setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % selectedCards.length);
    }, carouselConfig.autoPlayDelay * 1000);

    return () => clearTimeout(timer);
  }, [activeIndex, phase, selectedCards.length, carouselConfig.autoPlayDelay]);

  const handleCardClick = (i, cardData) => {
    if (i === activeIndex) {
      // Se è già attiva, apri la gallery
      if (onCarouselImageClick) onCarouselImageClick(cardData.imageData, i, selectedCards);
    } else {
      // Altrimenti selezionala
      setActiveIndex(i);
    }
  };

  // Imposta opacità a 1 all'inizio del carousel
  useLayoutEffect(() => {
    if (phase !== 'carousel') return;
    selectedCards.forEach((_, i) => {
      const matRef = cardRefs[i]?.materialRef;
      if (matRef?.current) matRef.current.opacity = 1;
    });
  }, [phase, selectedCards, cardRefs]);

  return (
    <group ref={groupRef} name="CarouselRing" visible={phase === 'carousel'}>
      {selectedCards.map((card, i) => {
        const layout = carouselData[i];
        if (!layout) return null;
        return (
          <VortexCard
            key={card.id}
            imageData={card.imageData}
            position={layout.position}
            rotation={layout.rotation}
            ringRadius={carouselConfig.radius}
            cardWidth={card.cardWidth * carouselConfig.cardScale}
            cardHeight={card.cardHeight * carouselConfig.cardScale}
            phase="carousel"
            outerGroupRef={cardRefs[i]?.outerGroupRef}
            animGroupRef={cardRefs[i]?.animGroupRef}
            materialRef={cardRefs[i]?.materialRef}
            onCardClick={() => handleCardClick(i, card)}
          />
        );
      })}
    </group>
  );
}

export function VortexLayout({
  phase,
  selectedCardId,
  carouselImages,
  setCarouselImages,
  onCardSelect,
  onCarouselImageClick,
  onSelectionComplete,
  onReturnComplete,
  autoSelectImageId,
}) {
  const vortexGroupRef = useRef();
  const timelineRef = useRef(null);

  // ── Build layout data with refs for each card ──
  const layoutData = useMemo(() => {
    const prng = mulberry32(SCENE_CONFIG.cards.randomOffsets.seed);
    const DEG2RAD = Math.PI / 180;
    const { layers } = SCENE_CONFIG.rings;
    const { baseWidth, randomOffsets } = SCENE_CONFIG.cards;
    const { vertical, radial, tiltX, tiltZ } = randomOffsets;

    let imageIndex = 0;
    const result = [];

    for (let li = 0; li < layers.length; li++) {
      const layer = layers[li];
      const cards = [];

      for (let c = 0; c < layer.count; c++) {
        const img = IMAGES[imageIndex % IMAGES.length];
        imageIndex++;

        const aspectRatio = img.w / img.h;
        const { width: cardWidth, height: cardHeight } = getClampedSize(aspectRatio, baseWidth, SCENE_CONFIG.cards);

        const baseAngle = (c / layer.count) * Math.PI * 2;
        const finalAngle = baseAngle + layer.angularOffset * DEG2RAD;

        const offV = vertical.min + prng() * (vertical.max - vertical.min);
        const offR = radial.min + prng() * (radial.max - radial.min);
        const rTiltX = (tiltX.min + prng() * (tiltX.max - tiltX.min)) * DEG2RAD;
        const rTiltZ = (tiltZ.min + prng() * (tiltZ.max - tiltZ.min)) * DEG2RAD;

        const r = layer.radius + offR;
        const x = r * Math.sin(finalAngle);
        const z = r * Math.cos(finalAngle);
        const y = layer.baseY + offV;

        cards.push({
          id: `${li}-${c}`,
          imageData: img,
          position: [x, y, z],
          rotation: [rTiltX, finalAngle, rTiltZ],
          ringRadius: layer.radius,
          cardWidth,
          cardHeight,
          outerGroupRef: createRef(),
          animGroupRef: createRef(),
          meshRef: createRef(),
          materialRef: createRef(),
        });
      }

      result.push({ layer: { ...layer, index: li }, cards });
    }

    return result;
  }, []);

  const allCards = useMemo(() => layoutData.flatMap(entry => entry.cards), [layoutData]);

  // ── AUTO-SELECT: triggered by tablet category selection ──────────
  useEffect(() => {
    if (!autoSelectImageId || phase !== 'idle') return;

    // Find the vortex card whose imageData.id matches
    const targetCard = allCards.find(c => c.imageData.id === autoSelectImageId);
    if (targetCard && onCardSelect) {
      onCardSelect(targetCard.id);
    }
  }, [autoSelectImageId, phase, allCards, onCardSelect]);

  // ── SELECTION ANIMATION ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'selecting' || !selectedCardId) return;

    const { unselected, selected, carouselCardCount } = SCENE_CONFIG.selection;
    const count = carouselCardCount || 8;

    const clickedCard = allCards.find(c => c.id === selectedCardId);
    if (!clickedCard) return;

    // ── Pick `count` cards from the vortex to become the carousel ──
    // Clicked card is always slot 0. The remaining (count-1) are picked by
    // distributing evenly across allCards so they come from all around the vortex.
    const others = allCards.filter(c => c.id !== selectedCardId);
    const step = Math.max(1, Math.floor(others.length / (count - 1)));
    const pickedVortexCards = [clickedCard];
    for (let i = 0; i < count - 1 && pickedVortexCards.length < count; i++) {
      pickedVortexCards.push(others[(i * step) % others.length]);
    }

    const unselectedCards = allCards.filter(c => !pickedVortexCards.find(s => s.id === c.id));

    // Publish carousel images in carousel-slot order (slot 0 = clicked card)
    setCarouselImages(pickedVortexCards.map(c => c.imageData));

    if (timelineRef.current) timelineRef.current.kill();
    const tl = gsap.timeline();
    timelineRef.current = tl;

    // ── Non-selected cards: fall into the void and dissolve ──
    unselectedCards.forEach((card, i) => {
      const mat        = card.materialRef.current;
      const outerGroup = card.outerGroupRef.current;
      const delay      = i * unselected.staggerDelay;

      if (mat)        tl.to(mat,                { opacity: 0,                                  duration: unselected.fallDuration, ease: unselected.ease }, delay);
      if (outerGroup) tl.to(outerGroup.position, { y: `+=${unselected.fallDistance}`,           duration: unselected.fallDuration, ease: unselected.ease }, delay);
    });

    // ── Selected cards: physically fly from vortex positions to carousel ring ──
    // worldToLocal converts the carousel ring's world-space positions into the
    // local space of each card's parent CylinderLayer group (which stopped rotating
    // instantly when phase left 'idle'), giving GSAP the correct local target.
    pickedVortexCards.forEach((card, slotIndex) => {
      const outerGroup = card.outerGroupRef.current;
      const animGroup  = card.animGroupRef.current;
      const mesh       = card.meshRef.current;
      if (!outerGroup?.parent) return;

      const angle       = (slotIndex / count) * Math.PI * 2;
      const radius      = SCENE_CONFIG.carousel.radius;
      const worldTarget = _tmpVec.set(
        radius * Math.sin(angle),
        SCENE_CONFIG.carousel.baseY,
        radius * Math.cos(angle),
      );

      // Ensure the parent's world matrix reflects the frozen rotation
      outerGroup.parent.updateWorldMatrix(true, false);
      // Clone before worldToLocal mutates the vector
      const localTarget = worldTarget.clone();
      outerGroup.parent.worldToLocal(localTarget);

      // Target rotation in the CylinderLayer's local space so the card faces
      // outward at the correct carousel angle in world space.
      // Shortest-path normalization avoids unwanted full spins.
      const parentRotY    = outerGroup.parent.rotation.y;
      const rawTargetRotY = angle - parentRotY;
      const curRotY       = outerGroup.rotation.y;
      let   diff          = ((rawTargetRotY - curRotY) % (Math.PI * 2));
      if (diff >  Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      const localTargetRotY = curRotY + diff;

      const cardScale = SCENE_CONFIG.carousel.cardScale;

      // Cancel floating / hover, fly position, align rotation, scale up to match carousel card size
      if (animGroup)  tl.to(animGroup.position,  { x: 0, y: 0, z: 0,                                     duration: selected.flyDuration * 0.4, ease: 'power2.out'  }, 0);
      if (mesh)       tl.to(mesh.position,        { z: 0,                                                  duration: 0.18,                       ease: 'power2.out'  }, 0);
      if (mesh)       tl.to(mesh.scale,           { x: cardScale, y: cardScale, z: cardScale,              duration: selected.flyDuration,        ease: selected.ease }, 0);
      if (outerGroup) tl.to(outerGroup.position,  { x: localTarget.x, y: localTarget.y, z: localTarget.z, duration: selected.flyDuration,        ease: selected.ease }, 0);
      if (outerGroup) tl.to(outerGroup.rotation,  { x: 0, y: localTargetRotY, z: 0,                       duration: selected.flyDuration,        ease: selected.ease }, 0);
    });

    // Trigger phase transition exactly when the last vortex card lands
    tl.call(() => { if (onSelectionComplete) onSelectionComplete(); }, [], selected.flyDuration);

    return () => tl.kill();
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── RETURN TO VORTEX ANIMATION ──────────────────────────────────
  useEffect(() => {
    if (phase !== 'returning') return;

    setCarouselImages([]);

    const { fadeInVortex, ease, staggerDelay } = SCENE_CONFIG.returnToVortex;

    if (timelineRef.current) timelineRef.current.kill();

    const tl = gsap.timeline({
      onComplete: () => { if (onReturnComplete) onReturnComplete(); },
    });
    timelineRef.current = tl;

    allCards.forEach((card, i) => {
      const mat        = card.materialRef.current;
      const mesh       = card.meshRef.current;
      const outerGroup = card.outerGroupRef.current;
      const animGroup  = card.animGroupRef.current;
      const delay      = i * staggerDelay;

      if (mat)        tl.to(mat,               { opacity: 1, emissiveIntensity: 0,                                                                    duration: fadeInVortex, ease }, delay);
      if (animGroup)  tl.to(animGroup.position, { x: 0, y: 0, z: 0,                                                                                   duration: fadeInVortex, ease }, delay);
      if (outerGroup) {
        tl.to(outerGroup.position, { x: card.position[0], y: card.position[1], z: card.position[2],                                                   duration: fadeInVortex, ease }, delay);
        tl.to(outerGroup.rotation, { x: card.rotation[0], y: card.rotation[1], z: card.rotation[2],                                                   duration: fadeInVortex, ease }, delay);
      }
      if (mesh) {
        tl.to(mesh.scale,    { x: 1, y: 1, z: 1, duration: fadeInVortex, ease }, delay);
        tl.to(mesh.position, { z: 0,             duration: fadeInVortex, ease }, delay);
      }
    });

    return () => tl.kill();
  }, [phase, allCards, onReturnComplete]);

  return (
    <group name="VortexLayout">
      <group ref={vortexGroupRef} visible={phase !== 'carousel' && phase !== 'gallery' && phase !== 'enteringGallery'}>
        {layoutData.map((entry) => (
          <CylinderLayer
            key={entry.layer.index}
            layer={entry.layer}
            cards={entry.cards}
            phase={phase}
            onCardClick={onCardSelect}
          />
        ))}
      </group>

      {carouselImages.length > 0 && (
        <CarouselRing images={carouselImages} phase={phase} onCarouselImageClick={onCarouselImageClick} />
      )}
    </group>
  );
}
