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
  /** the camera is up but the model is still downloading: `{pct}` is replaced (whole percent) */
  downloading: string;
  privacy: string;
  /**
   * Onboarding card, bottom-centre: after the gate until the first gesture
   * succeeds (or 10 s), and again on `?`. Two lines per device; each line
   * breaks only at its " · " separators.
   */
  guideHand: readonly [string, string];
  guidePointer: readonly [string, string];
  guideTouch: readonly [string, string];
  /** third line of the card on `?` */
  keyboardHint: string;
  /** under the caption, the first time a print opens — how to close it */
  hintCloseHand: string;
  hintClosePointer: string;
  hintCloseTouch: string;
  /** sensor failure dialog */
  errDenied: string;
  errTimeout: string;
  errUnsupported: string;
  /** the hand model (wasm / task file) failed to load — a network problem, retry offered */
  errModel: string;
  errBody: string;
  errButton: string;
  errRetry: string;
  /** screen-reader status for the keyboard path: `{n}` / `{total}` are replaced */
  srCard: string;
  srHeld: string;
  srReleased: string;
  srTorn: string;
  srPushed: string;
  srOpened: string;
  srClosed: string;
  /** WebGL unavailable / context lost fallbacks */
  noWebgl: string;
  contextLost: string;
  /**
   * One-liners under an opened print, drawn at random (never the same twice
   * in a row). In the voice of the Vortex captions — about hands, holding,
   * closing — and, like them, English in both locales.
   */
  captions: readonly string[];
}

/** Shared by both locales — the captions speak English everywhere. */
const CAPTIONS: readonly string[] = [
  "what the hand closes, the eye keeps",
  "held long enough, paper remembers the hand",
  "a closed hand is a room with one thing in it",
  "closing is how the hand says look",
  "the print waited for a hand to shut",
  "nothing is taken, only kept for a moment",
  "held still, the dark comes closer",
  "what you close on, opens",
  "the hand knows the weight before the eye",
  "everything held is briefly the centre",
  "let go, and it returns to the drift",
  "a grip is a way of looking twice",
  "paper keeps what fingers press into it",
  "the hand shuts; the picture comes forward",
];

const en: HandsCopy = {
  metaTitle: "Mani — Hands",
  metaDescription:
    "Your hands, read by the webcam: pinch a print out of the drift, carry it, close your hand on it to open it, tear it in two. Processed locally — nothing is recorded or sent anywhere.",
  aria: "Mani — hand-tracked gallery of prints. With the camera: pinch to hold a print, close your hand on it to open it, sweep an open hand to close it, pull with both hands to tear it, push an open palm to scatter them. With the pointer: press to hold, click to open, flick or double-click to close, shift-drag to tear, double-click to push. Keys: Tab cycles the prints, Space holds or releases, Enter opens the focused print, arrows move a held print, T tears it, P pushes from the centre, ? shows the guide, Escape closes an opened print and, pressed again, exits; Backspace closes it too.",
  exit: "← exit the demo",
  enable: "enable the camera",
  pointerMode: "or use the pointer",
  initializing: "initializing",
  downloading: "downloading the model… {pct} %",
  privacy:
    "the camera is processed locally, in your browser. nothing is recorded, stored or sent anywhere.",
  guideHand: [
    "pinch a print to hold it · close your hand on it to open it",
    "swipe your open hand to close it · two hands to tear · open palm to push",
  ],
  guidePointer: [
    "press to hold · shift + drag to tear · double-click to push",
    "click to open · flick to close",
  ],
  guideTouch: [
    "touch to hold · spread two fingers to tear · double-tap to push",
    "tap to open · swipe to close",
  ],
  keyboardHint: "tab print · space hold · enter open · arrows move · t tear · p push · esc close, then exit",
  hintCloseHand: "swipe to close",
  hintClosePointer: "flick to close",
  hintCloseTouch: "swipe to close",
  errDenied: "the camera isn't available",
  errTimeout: "the camera isn't responding",
  errUnsupported: "this browser can't read the camera",
  errModel: "the hand model didn't load",
  errBody:
    "Allow the camera to use your hands — or carry on with the pointer and the keyboard. Nothing changes in the piece.",
  errButton: "continue with the pointer",
  errRetry: "try the camera again",
  srCard: "print {n} of {total}",
  srHeld: "held",
  srReleased: "released",
  srTorn: "torn",
  srPushed: "pushed",
  srOpened: "opened",
  srClosed: "closed",
  noWebgl: "This demo needs WebGL. Your browser or device doesn't support it.",
  contextLost: "The graphics context was lost. Reload the page to continue.",
  captions: CAPTIONS,
};

const it: HandsCopy = {
  metaTitle: "Mani — Hands",
  metaDescription:
    "Le tue mani, lette dalla webcam: pizzica una stampa dalla deriva, portala con te, chiudi la mano su di essa per aprirla, strappala in due. Tutto in locale — niente viene registrato o inviato.",
  aria: "Mani — galleria di stampe guidata dalle mani. Con la fotocamera: pizzica per tenere una stampa, chiudi la mano su di essa per aprirla, spazza con la mano aperta per chiuderla, tira con due mani per strapparla, spingi col palmo aperto per disperderle. Col puntatore: premi per tenere, clic per aprire, uno scatto o un doppio clic per chiudere, maiusc + trascina per strappare, doppio clic per spingere. Tasti: Tab scorre le stampe, Spazio tiene o lascia, Invio apre la stampa selezionata, le frecce spostano la stampa tenuta, T la strappa, P spinge dal centro, ? mostra la guida, Esc chiude la stampa aperta e, premuto di nuovo, esce; anche Backspace la chiude.",
  exit: "← esci dalla demo",
  enable: "attiva la fotocamera",
  pointerMode: "oppure usa il puntatore",
  initializing: "avvio in corso",
  downloading: "scarico il modello… {pct} %",
  privacy:
    "la fotocamera viene elaborata in locale, nel tuo browser. niente viene registrato, salvato o inviato da nessuna parte.",
  guideHand: [
    "pizzica una stampa per tenerla · chiudi la mano su di essa per aprirla",
    "spazza con la mano aperta per chiuderla · due mani per strappare · palmo aperto per spingere",
  ],
  guidePointer: [
    "premi per tenere · maiusc + trascina per strappare · doppio clic per spingere",
    "clic per aprire · trascina di scatto per chiudere",
  ],
  guideTouch: [
    "tocca per tenere · allarga due dita per strappare · doppio tocco per spingere",
    "tocca per aprire · scorri per chiudere",
  ],
  keyboardHint: "tab stampa · spazio tieni · invio apri · frecce sposta · t strappa · p spingi · esc chiudi, poi esci",
  hintCloseHand: "spazza per chiudere",
  hintClosePointer: "trascina di scatto per chiudere",
  hintCloseTouch: "scorri per chiudere",
  errDenied: "la fotocamera non è disponibile",
  errTimeout: "la fotocamera non risponde",
  errUnsupported: "questo browser non riesce a leggere la fotocamera",
  errModel: "il modello delle mani non si è caricato",
  errBody:
    "Consenti la fotocamera per usare le mani — oppure continua con il puntatore e la tastiera. Il pezzo non cambia.",
  errButton: "continua con il puntatore",
  errRetry: "riprova con la fotocamera",
  srCard: "stampa {n} di {total}",
  srHeld: "tenuta",
  srReleased: "lasciata",
  srTorn: "strappata",
  srPushed: "spinta",
  srOpened: "aperta",
  srClosed: "chiusa",
  noWebgl: "Questa demo richiede WebGL. Il tuo browser o dispositivo non lo supporta.",
  contextLost: "Il contesto grafico è andato perso. Ricarica la pagina per continuare.",
  captions: CAPTIONS,
};

export const HANDS_COPY: Record<Locale, HandsCopy> = { en, it };
