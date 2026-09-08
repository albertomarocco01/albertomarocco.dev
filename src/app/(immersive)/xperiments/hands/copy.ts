import type { Locale } from "@/lib/locale";

/**
 * All translatable text for the Mani demo, keyed by locale — the same
 * arrangement as the sibling Tarassaco / Vortex demos. The tree that renders it
 * is client-only (`ssr: false`), so `page.tsx` resolves the locale and hands
 * these strings down as one prop. Typing both entries as `HandsCopy` keeps
 * EN/IT parity compiler-enforced.
 *
 * The piece's own name — "Mani — Hands" — is a title, not copy, and stays as-is
 * in both locales. Every visitor-facing string belongs here, never inline in a
 * component. HUD labels are lowercase mono, few words.
 */
export interface HandsCopy {
  metaTitle: string;
  metaDescription: string;
  /** aria-label on the stage — describes the interaction and the keys */
  aria: string;
  /** persistent exit link, top-left, back to /graphic-designs */
  exit: string;
  /** gate */
  enable: string;
  pointerMode: string;
  initializing: string;
  privacy: string;
  /** HUD legend, bottom-centre, 4 s after the gate and on `?` */
  legend: string;
  legendPointer: string;
  legendTouch: string;
  keyboardHint: string;
  /** sensor failure dialog */
  errDenied: string;
  errTimeout: string;
  errUnsupported: string;
  errBody: string;
  errButton: string;
  errRetry: string;
  /** screen-reader status for the keyboard path: `{n}` / `{total}` are replaced */
  srCard: string;
  srHeld: string;
  srReleased: string;
  srTorn: string;
  srPushed: string;
  /** WebGL unavailable / context lost fallbacks */
  noWebgl: string;
  contextLost: string;
}

const en: HandsCopy = {
  metaTitle: "Mani — Hands",
  metaDescription:
    "Your hands, read by the webcam: pinch a print out of the drift, carry it, tear it in two. Processed locally — nothing is recorded or sent anywhere.",
  aria: "Mani — hand-tracked gallery of prints. With the camera: pinch to hold a print, pull with both hands to tear it, push an open palm to scatter them. With the pointer: press to hold, shift-drag to tear, double-click to push. Keys: Tab cycles the prints, Space holds or releases, arrows move a held print, T tears it, P pushes from the centre, ? shows the legend, Escape exits.",
  exit: "← exit the demo",
  enable: "enable the camera",
  pointerMode: "or use the pointer",
  initializing: "initializing",
  privacy:
    "the camera is processed locally, in your browser. nothing is recorded, stored or sent anywhere.",
  legend: "pinch to hold · two hands to tear · open palm to push",
  legendPointer: "press to hold · shift + drag to tear · double-click to push",
  legendTouch: "touch to hold · spread two fingers to tear · double-tap to push",
  keyboardHint: "tab print · space hold · arrows move · t tear · p push · esc exit",
  errDenied: "the camera isn't available",
  errTimeout: "the camera isn't responding",
  errUnsupported: "this browser can't read the camera",
  errBody:
    "Allow the camera to use your hands — or carry on with the pointer and the keyboard. Nothing changes in the piece.",
  errButton: "continue with the pointer",
  errRetry: "try the camera again",
  srCard: "print {n} of {total}",
  srHeld: "held",
  srReleased: "released",
  srTorn: "torn",
  srPushed: "pushed",
  noWebgl: "This demo needs WebGL. Your browser or device doesn't support it.",
  contextLost: "The graphics context was lost. Reload the page to continue.",
};

const it: HandsCopy = {
  metaTitle: "Mani — Hands",
  metaDescription:
    "Le tue mani, lette dalla webcam: pizzica una stampa dalla deriva, portala con te, strappala in due. Tutto in locale — niente viene registrato o inviato.",
  aria: "Mani — galleria di stampe guidata dalle mani. Con la fotocamera: pizzica per tenere una stampa, tira con due mani per strapparla, spingi col palmo aperto per disperderle. Col puntatore: premi per tenere, maiusc + trascina per strappare, doppio clic per spingere. Tasti: Tab scorre le stampe, Spazio tiene o lascia, le frecce spostano la stampa tenuta, T la strappa, P spinge dal centro, ? mostra la legenda, Esc esce.",
  exit: "← esci dalla demo",
  enable: "attiva la fotocamera",
  pointerMode: "oppure usa il puntatore",
  initializing: "avvio in corso",
  privacy:
    "la fotocamera viene elaborata in locale, nel tuo browser. niente viene registrato, salvato o inviato da nessuna parte.",
  legend: "pizzica per tenere · due mani per strappare · palmo aperto per spingere",
  legendPointer: "premi per tenere · maiusc + trascina per strappare · doppio clic per spingere",
  legendTouch: "tocca per tenere · allarga due dita per strappare · doppio tocco per spingere",
  keyboardHint: "tab stampa · spazio tieni · frecce sposta · t strappa · p spingi · esc esci",
  errDenied: "la fotocamera non è disponibile",
  errTimeout: "la fotocamera non risponde",
  errUnsupported: "questo browser non riesce a leggere la fotocamera",
  errBody:
    "Consenti la fotocamera per usare le mani — oppure continua con il puntatore e la tastiera. Il pezzo non cambia.",
  errButton: "continua con il puntatore",
  errRetry: "riprova con la fotocamera",
  srCard: "stampa {n} di {total}",
  srHeld: "tenuta",
  srReleased: "lasciata",
  srTorn: "strappata",
  srPushed: "spinta",
  noWebgl: "Questa demo richiede WebGL. Il tuo browser o dispositivo non lo supporta.",
  contextLost: "Il contesto grafico è andato perso. Ricarica la pagina per continuare.",
};

export const HANDS_COPY: Record<Locale, HandsCopy> = { en, it };
