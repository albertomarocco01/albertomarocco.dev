import React, { useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { SCENE_CONFIG } from '../config/scene.config.js';
import { VortexCard } from './VortexCard.jsx';

/**
 * GalleryTransitionScene — gestisce il passaggio tra Carosello e Gallery.
 * Le card non selezionate cadono verso il basso e svaniscono (opacity: 0).
 */
export function GalleryTransitionScene({ phase, images, selectedImage, onComplete }) {
  const groupRef = useRef();
  const carouselConfig = SCENE_CONFIG.carousel;
  const { gallery } = SCENE_CONFIG;

  const cardsData = useMemo(() => {
    if (!images || images.length === 0) return [];
    const count = images.length;
    const r = carouselConfig.radius;
    return images.map((img, i) => {
      const angle = (i / count) * Math.PI * 2;
      const pos = [r * Math.sin(angle), carouselConfig.baseY, r * Math.cos(angle)];
      return {
        id: `trans-${i}`,
        imageData: img,
        position: pos,
        rotation: [0, angle, 0],
        isSelected: img.url === selectedImage?.url,
        cardWidth: SCENE_CONFIG.cards.baseWidth * carouselConfig.cardScale,
        cardHeight: (SCENE_CONFIG.cards.baseWidth * carouselConfig.cardScale) / (img.w / img.h),
      };
    });
  }, [images, selectedImage, carouselConfig]);

  // Refs per ogni carta della transizione
  const cardRefs = useMemo(
    () => cardsData.map(() => ({ outerGroupRef: React.createRef(), materialRef: React.createRef() })),
    [cardsData]
  );

  // Allinea la rotazione iniziale del gruppo con la posizione dell'immagine selezionata (front-center)
  useLayoutEffect(() => {
    if (phase === 'enteringGallery' && groupRef.current && cardsData.length > 0) {
      const clickedIdx = cardsData.findIndex(c => c.isSelected);
      if (clickedIdx !== -1) {
        const count = cardsData.length;
        groupRef.current.rotation.y = -(clickedIdx / count) * Math.PI * 2;
      }
    }
  }, [phase, cardsData]);

  useEffect(() => {
    if (phase !== 'enteringGallery' || cardsData.length === 0) return;

    const tl = gsap.timeline({
      onComplete: () => { if (onComplete) onComplete(); }
    });

    cardsData.forEach((card, i) => {
      const refs = cardRefs[i];
      if (!refs?.outerGroupRef.current) return;

      // Delay iniziale per far risaltare il lampo della card selezionata prima della caduta
      const fallDelay = 0.35;
      
      if (card.isSelected && refs.outerGroupRef.current) {
        // "Lampo" / Pop: la card selezionata avanza e si ingrandisce leggermente
        tl.to(refs.outerGroupRef.current.scale, {
          x: 1.25, y: 1.25, z: 1.25,
          duration: 0.35,
          ease: 'back.out(2)',
        }, 0);
        
        // Effetto luminosità (se il material lo supporta)
        if (refs.materialRef.current) {
          tl.to(refs.materialRef.current, { emissiveIntensity: 0.5, duration: 0.15 }, 0)
            .to(refs.materialRef.current, { emissiveIntensity: 0, duration: 0.2 }, 0.15);
        }
      }

      // Tutte le card cadono fluidamente con un lievissimo scarto (stagger)
      const stagger = fallDelay + (i * 0.02);
      
      tl.to(refs.outerGroupRef.current.position, {
        y: '-=15',
        duration: 1.1,
        ease: 'power3.in', // Ancora più smooth in accelerazione
      }, stagger);
      
      if (refs.materialRef.current) {
        tl.to(refs.materialRef.current, {
          opacity: 0,
          duration: 0.9,
          ease: 'power2.in',
        }, stagger + 0.1);
      }

    });

    return () => tl.kill();
  }, [phase, cardsData, cardRefs, onComplete, gallery.expansionDuration]);

  if (phase !== 'enteringGallery') return null;

  return (
    <group ref={groupRef} name="GalleryTransitionScene">
      {cardsData.map((card, i) => {
        // Renderiamo TUTTE le card, inclusa quella selezionata
        return (
          <VortexCard
            key={card.id}
            imageData={card.imageData}
            position={card.position}
            rotation={card.rotation}
            ringRadius={carouselConfig.radius}
            cardWidth={card.cardWidth}
            cardHeight={card.cardHeight}
            outerGroupRef={cardRefs[i]?.outerGroupRef}
            materialRef={cardRefs[i]?.materialRef}
            phase="enteringGallery"
          />
        );
      })}
    </group>
  );
}
