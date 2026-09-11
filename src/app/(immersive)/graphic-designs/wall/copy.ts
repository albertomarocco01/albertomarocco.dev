import type { Locale } from "@/lib/locale";

/**
 * All translatable text for the Parete demo, keyed by locale — the same
 * arrangement as the sibling Tarassaco / Vortex demos. The tree that renders it
 * is client-only (`ssr: false`), so `page.tsx` resolves the locale and hands
 * these strings down as one prop. Typing both entries as `WallCopy` keeps
 * EN/IT parity compiler-enforced.
 *
 * The piece's own name — "Parete — LED Wall" — is a title, not copy, and stays
 * as-is in both locales, as does the loop's title ("Liminal Field") and the
 * four variant names (amber / ember / teal / violet), which are the shared
 * palette's own keys. Numbers and units live in `wall.config.ts`; only the
 * labels around them are here.
 */
export interface WallCopy {
  metaTitle: string;
  metaDescription: string;
  /** aria-label on the stage — describes the interaction and the keys */
  aria: string;
  /** persistent exit link, top-left, back to /graphic-designs */
  exit: string;
  /** WebGL unavailable / context lost fallbacks */
  noWebgl: string;
  contextLost: string;
  /** the keys, under the title cover; fades on the first interaction */
  keyboardHint: string;
  /** spec-sheet labels, bottom-left. The values come from wall.config.ts. */
  spec: {
    wall: string;
    pitch: string;
    cabinets: string;
    loop: string;
    distance: string;
  };
  /** the loop's title — a work title, identical in both locales */
  loopTitle: string;
  /** camera preset names, bottom-right pager */
  views: { front: string; oblique: string; close: string };
  /** accessible group labels and the two loop arrows */
  viewsAria: string;
  loopAria: string;
  prevLoop: string;
  nextLoop: string;
  /** decimal mark for the pitch and the live distance (2.6 mm / 2,6 mm) */
  decimal: string;
}

const en: WallCopy = {
  metaTitle: "Parete — LED Wall",
  metaDescription:
    "A 6 × 3 m LED wall in a dark room running the generative loops live. Orbit it, switch loops, get close enough to see the pixel pitch.",
  aria: "Parete — 3D preview of a 6 by 3 metre LED wall. Drag to orbit, wheel to dolly, keys 1 2 3 for views, arrow keys switch the loop, Escape exits.",
  exit: "← exit the demo",
  noWebgl: "This demo needs WebGL. Your browser or device doesn't support it.",
  contextLost: "The graphics context was lost. Reload the page to continue.",
  keyboardHint: "1 2 3 views · ← → loop · drag orbits · wheel dollies",
  spec: {
    wall: "led wall",
    pitch: "pitch",
    cabinets: "cabinets",
    loop: "loop",
    distance: "distance",
  },
  loopTitle: "Liminal Field",
  views: { front: "front", oblique: "oblique", close: "close" },
  viewsAria: "camera view",
  loopAria: "loop",
  prevLoop: "previous loop",
  nextLoop: "next loop",
  decimal: ".",
};

const it: WallCopy = {
  metaTitle: "Parete — LED Wall",
  metaDescription:
    "Un led wall di 6 × 3 m in una stanza buia con i loop generativi dal vivo. Giraci intorno, cambia loop, avvicinati fino a vedere il pixel pitch.",
  aria: "Parete — anteprima 3D di un led wall di 6 per 3 metri. Trascina per orbitare, rotella per avvicinarti, tasti 1 2 3 per le viste, le frecce cambiano loop, Esc esce.",
  exit: "← esci dalla demo",
  noWebgl: "Questa demo richiede WebGL. Il tuo browser o dispositivo non lo supporta.",
  contextLost: "Il contesto grafico è andato perso. Ricarica la pagina per continuare.",
  keyboardHint: "1 2 3 viste · ← → loop · trascina per girare · rotella per avvicinare",
  spec: {
    wall: "led wall",
    pitch: "pitch",
    cabinets: "cabinet",
    loop: "loop",
    distance: "distanza",
  },
  loopTitle: "Liminal Field",
  views: { front: "frontale", oblique: "obliqua", close: "da vicino" },
  viewsAria: "vista",
  loopAria: "loop",
  prevLoop: "loop precedente",
  nextLoop: "loop successivo",
  decimal: ",",
};

export const WALL_COPY: Record<Locale, WallCopy> = { en, it };
