import type { Locale } from "@/lib/locale";
import type { TourStationId } from "./wall.config";

/**
 * All translatable text for the Parete demo, keyed by locale — the same
 * arrangement as the sibling Tarassaco / Vortex demos. The tree that renders it
 * is client-only (`ssr: false`), so `page.tsx` resolves the locale and hands
 * these strings down as one prop. Typing both entries as `WallCopy` keeps
 * EN/IT parity compiler-enforced.
 *
 * The piece's own name — "Parete · LED Wall" — is a title, not copy, and stays
 * as-is in both locales, as does the loop's title ("Liminal Field"), the
 * four variant names (amber / ember / teal / violet), which are the shared
 * palette's own keys, and the two trade terms on the spec line. Numbers and
 * units live in `wall.config.ts`; only the labels around them are here.
 *
 * "LED wall" is cased by register: prose — the title, the description, the
 * aria strings, the card lines — writes "LED wall" in English ("an LED wall")
 * and "led wall" in Italian, as the dictionary does in each language; the HUD
 * strings (`spec.wall`, `tour.label`) are written lowercase because the mono
 * register lowercases them on screen (`text-transform` in wall.css, the site's
 * convention), so the source reads as the screen does.
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
    /** the rigging, in the trade's own English in both locales */
    rig: string;
    loop: string;
    distance: string;
  };
  /** the loop's title — a work title, identical in both locales */
  loopTitle: string;
  /** camera preset names, bottom-right pager */
  views: { front: string; oblique: string; close: string; back: string };
  /** accessible labels of the two control groups: the view pager, the palette row */
  viewsAria: string;
  loopAria: string;
  /** decimal mark for the pitch and the live distance (2.6 mm / 2,6 mm) */
  decimal: string;
  /** the guided tour — "what is a LED wall", six stations */
  tour: {
    /** the in-scene label that opens it (a button; key `i`) */
    label: string;
    /** accessible name of the card */
    aria: string;
    /** the card's pager */
    next: string;
    back: string;
    close: string;
    /** the close button's accessible name — says what the second Esc does */
    closeAria: string;
    /** the live region: `station 3 of 6 · title` */
    station: string;
    of: string;
    /** the last station's call: an internal link to the contact panel */
    cta: string;
    /** one card per station: a serif title and two or three mono lines */
    stations: Record<TourStationId, { title: string; lines: readonly string[] }>;
  };
}

const en: WallCopy = {
  metaTitle: "Parete · LED Wall",
  metaDescription:
    "A 6 × 3 m LED wall in a dark room, running a generative loop live. Orbit it, walk round the back, switch palettes, or take the tour of what an LED wall is.",
  aria: "Parete — 3D preview of a 6 by 3 metre LED wall. Drag to orbit, wheel to dolly, w a s d to walk, keys 1 2 3 4 for views (4 is the back), the left and right arrows or the swatches change the loop's palette. The i key or the label beside the wall opens a short tour of what an LED wall is: the down and up arrows, Space, the wheel or a vertical swipe move between its six stations; Escape closes the tour, and a second Escape exits the demo.",
  exit: "← exit the demo",
  noWebgl: "This demo needs WebGL. Your browser or device doesn't support it.",
  contextLost: "The graphics context was lost. Reload the page to continue.",
  keyboardHint: "1 2 3 4 views · ← → palette · i tour · wasd walks · drag orbits · wheel dollies",
  spec: {
    wall: "led wall",
    pitch: "pitch",
    cabinets: "cabinets",
    rig: "ground support · daisy-chain",
    loop: "loop",
    distance: "distance",
  },
  loopTitle: "Liminal Field",
  views: { front: "front", oblique: "oblique", close: "close", back: "back" },
  viewsAria: "camera view",
  loopAria: "loop palette",
  decimal: ".",
  tour: {
    label: "what is an led wall? →",
    aria: "what is an LED wall — a short tour in six stations",
    next: "next →",
    back: "← back",
    close: "× close",
    closeAria: "close the tour — Escape; a second Escape exits the demo",
    station: "station",
    of: "of",
    cta: "commission a loop →",
    stations: {
      what: {
        title: "What it is",
        lines: [
          "A wall built from LED cabinets, each one a grid of lamps.",
          "One image runs across all of them, from a single processor.",
          "Brighter than a projector, and it holds in daylight.",
        ],
      },
      pitch: {
        title: "Pitch",
        lines: [
          "The distance between two lamps, in millimetres. Here, 2.6.",
          "It sets how close you can stand before the picture turns to dots — roughly the pitch, read in metres.",
          "From 2.6 m back, this wall is one image.",
        ],
      },
      cabinets: {
        title: "Cabinets",
        lines: [
          "Modules of 500 mm — twelve by six here, seventy-two in all.",
          "Any size, any shape: a corner, a column, a floor.",
          "Assembled in hours; the seams vanish a few metres back.",
        ],
      },
      behind: {
        title: "Behind it",
        lines: [
          "Ground support holds it up; power and data run cabinet to cabinet in a chain.",
          "One processor drives the whole wall. Upstream of it, a laptop.",
        ],
      },
      where: {
        title: "Where",
        lines: [
          "Stages and events, product launches, shop windows, studios.",
          "What I add is content made for the wall itself: generative, live, never a video file.",
          "The loop on this wall is one of them.",
        ],
      },
      commission: {
        title: "Commission a loop",
        lines: [
          "A wall like this one, running a loop made for it — the size, the pitch, the room.",
          "One message is enough.",
        ],
      },
    },
  },
};

const it: WallCopy = {
  metaTitle: "Parete · LED Wall",
  metaDescription:
    "Un led wall di 6 × 3 m in una stanza buia, con un loop generativo dal vivo. Giraci intorno, passa dietro, cambia palette, o segui il tour su cos'è un led wall.",
  aria: "Parete — anteprima 3D di un led wall di 6 per 3 metri. Trascina per orbitare, rotella per avvicinarti, w a s d per muoverti, tasti 1 2 3 4 per le viste (4 è il retro), le frecce sinistra e destra o i campioni di colore cambiano la palette del loop. Il tasto i o l'etichetta accanto alla parete aprono un breve tour su cos'è un led wall: le frecce giù e su, Spazio, la rotella o uno scorrimento verticale passano fra le sei tappe; Esc chiude il tour, un secondo Esc esce dalla demo.",
  exit: "← esci dalla demo",
  noWebgl: "Questa demo richiede WebGL. Il tuo browser o dispositivo non lo supporta.",
  contextLost: "Il contesto grafico è andato perso. Ricarica la pagina per continuare.",
  keyboardHint: "1 2 3 4 viste · ← → palette · i tour · wasd per muoverti · trascina per girare · rotella per avvicinare",
  spec: {
    wall: "led wall",
    pitch: "pitch",
    cabinets: "cabinet",
    rig: "ground support · daisy-chain",
    loop: "loop",
    distance: "distanza",
  },
  loopTitle: "Liminal Field",
  views: { front: "frontale", oblique: "obliqua", close: "da vicino", back: "retro" },
  viewsAria: "vista",
  loopAria: "palette del loop",
  decimal: ",",
  tour: {
    label: "cos'è un led wall? →",
    aria: "cos'è un led wall — un breve tour in sei tappe",
    next: "avanti →",
    back: "← indietro",
    close: "× chiudi",
    closeAria: "chiudi il tour — Esc; un secondo Esc esce dalla demo",
    station: "tappa",
    of: "di",
    cta: "commissiona un loop →",
    stations: {
      what: {
        title: "Cos'è",
        lines: [
          "Una parete di cabinet led, ognuno una griglia di lampade.",
          "Un'unica immagine corre su tutti, da un solo processore.",
          "Più luminoso di un proiettore, e regge anche alla luce del giorno.",
        ],
      },
      pitch: {
        title: "Pitch",
        lines: [
          "La distanza fra due lampade, in millimetri. Qui, 2,6.",
          "Decide quanto puoi avvicinarti prima che l'immagine si sciolga in punti: più o meno il pitch, letto in metri.",
          "Da 2,6 m in poi, questa parete è un'immagine sola.",
        ],
      },
      cabinets: {
        title: "Cabinet",
        lines: [
          "Moduli da 500 mm: qui dodici per sei, settantadue in tutto.",
          "Qualsiasi misura, qualsiasi forma: un angolo, una colonna, un pavimento.",
          "Si montano in poche ore; le giunzioni spariscono a qualche metro di distanza.",
        ],
      },
      behind: {
        title: "Dietro",
        lines: [
          "Lo regge una struttura a terra; corrente e dati passano di cabinet in cabinet, a catena.",
          "Un solo processore pilota tutta la parete. A monte, un portatile.",
        ],
      },
      where: {
        title: "Dove",
        lines: [
          "Palchi ed eventi, lanci di prodotto, vetrine, studi.",
          "Quello che aggiungo io è il contenuto pensato per la parete stessa: generativo, dal vivo, mai un file video.",
          "Il loop su questa parete è uno di quelli.",
        ],
      },
      commission: {
        title: "Commissiona un loop",
        lines: [
          "Una parete come questa, con un loop fatto su misura: la dimensione, il pitch, la stanza.",
          "Basta un messaggio.",
        ],
      },
    },
  },
};

export const WALL_COPY: Record<Locale, WallCopy> = { en, it };
