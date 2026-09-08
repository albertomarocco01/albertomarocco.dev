import type { Locale } from "@/lib/locale";

/**
 * All translatable text for the Camera Oscura demo, keyed by locale — the same
 * arrangement as the sibling Tarassaco / Vortex demos. The tree that renders it
 * is client-only (`ssr: false`), so `page.tsx` resolves the locale and hands
 * these strings down as one prop. Typing both entries as `DarkroomCopy` keeps
 * EN/IT parity compiler-enforced.
 *
 * The piece's own name — "Camera Oscura — Darkroom" — is a title, not copy, and
 * stays as-is in both locales. HUD labels are lowercase mono, few words.
 */
export interface DarkroomCopy {
  metaTitle: string;
  metaDescription: string;
  /** aria-label on the stage — describes the interaction and the keys */
  aria: string;
  /** persistent exit link, top-left, back to /graphic-designs */
  exit: string;
  /** centred idle hint on a fresh print, fades on the first movement */
  hint: string;
  /** keyboard hint under the idle hint (hidden on coarse pointers) */
  keyboardHint: string;
  /** HUD, bottom-left: `print 03 / 12` — the label before the counter */
  print: string;
  /** HUD, bottom-right: `developing 42 %` → `fixed` */
  developing: string;
  fixed: string;
  /** the visible advance control under reduced motion */
  nextPrint: string;
  /** accessible name of the same control */
  nextPrintAria: string;
  /** WebGL unavailable / context lost fallbacks */
  noWebgl: string;
  contextLost: string;
}

const en: DarkroomCopy = {
  metaTitle: "Camera Oscura — Darkroom",
  metaDescription:
    "Stir the developer with your pointer and photographs develop where it has moved — a GPU fluid simulation, entirely in your browser.",
  aria: "Camera Oscura — interactive darkroom. Move the pointer or a finger to stir the developer and the print develops where the liquid moves. Space agitates the tray, right and left arrows change print, Escape exits.",
  exit: "← exit the demo",
  hint: "stir the developer",
  keyboardHint: "space agitates · ← → change print · esc exits",
  print: "print",
  developing: "developing",
  fixed: "fixed",
  nextPrint: "next print →",
  nextPrintAria: "Next print",
  noWebgl: "This demo needs WebGL 2. Your browser or device doesn't support it.",
  contextLost: "The graphics context was lost. Reload the page to continue.",
};

const it: DarkroomCopy = {
  metaTitle: "Camera Oscura — Darkroom",
  metaDescription:
    "Muovi lo sviluppo con il puntatore e le fotografie affiorano dove è passato — una simulazione di fluido su GPU, tutta nel tuo browser.",
  aria: "Camera Oscura — camera oscura interattiva. Muovi il puntatore o un dito per smuovere lo sviluppo: la stampa affiora dove il liquido si muove. Spazio agita la bacinella, le frecce destra e sinistra cambiano stampa, Esc esce.",
  exit: "← esci dalla demo",
  hint: "muovi lo sviluppo",
  keyboardHint: "spazio agita · ← → cambia stampa · esc esce",
  print: "stampa",
  developing: "in sviluppo",
  fixed: "fissata",
  nextPrint: "stampa successiva →",
  nextPrintAria: "Stampa successiva",
  noWebgl: "Questa demo richiede WebGL 2. Il tuo browser o dispositivo non lo supporta.",
  contextLost: "Il contesto grafico è andato perso. Ricarica la pagina per continuare.",
};

export const DARKROOM_COPY: Record<Locale, DarkroomCopy> = { en, it };
