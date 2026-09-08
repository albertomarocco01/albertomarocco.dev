// Hand-rolled EN/IT localization. No i18n library, no [lang] routing, no
// middleware: the active locale is read from a `locale` cookie on the server
// (defaulting to Italian, the site's primary language) and the matching
// dictionary is threaded to components as a prop. Proper nouns and tech/brand
// tokens (names, "webgl", "touchdesigner", "led", years, the email, the domain,
// "P.IVA") stay untranslated on purpose.
//
// This module is deliberately free of `next/headers`. `getLocale()`, which
// reads the cookie and is server-only, lives in ./i18n.ts — which re-exports
// everything here, so `@/lib/i18n` stays the single import for server code.
// The locale primitives (./locale.ts) and the few strings the client-only
// route fallbacks need (./boundary-copy.ts) are split out and re-exported: an
// error boundary loads with its segment on every page, and importing the
// dictionaries there shipped both of them, in full, to every visitor.
//
// The two immersive demos under /xperiments keep their copy next to themselves
// (see xperiments/*/copy.ts) — same cookie + dictionary approach, typed against
// `Locale` so parity is still compiler-enforced, but their vocabulary is their
// own and doesn't belong in the site dictionary.

import type { Locale } from "./locale";
import { ERROR_COPY, LOADER_TAG, type ErrorText } from "./boundary-copy";
import { CONTACT } from "./contact";

export { DEFAULT_LOCALE, OG_LOCALE, isLocale } from "./locale";
export type { Locale } from "./locale";
export type { ErrorText } from "./boundary-copy";

/** Translatable text for one work row, keyed by the work `id`. */
export interface WorkText {
  /** the mono meta line under the row title (discipline · tech · year) */
  meta: string;
  description: string;
  cue: string;
  /** alt text for the row's preview image, on the rows that have one */
  alt?: string;
}

/** Translatable text for one graphic-designs demo card, keyed by its `id`. */
export interface DemoText {
  title: string;
  meta: string;
  desc: string;
}

/** Head + heading copy shared by the plain index pages (/websites, /xperiments). */
export interface PageText {
  metaTitle: string;
  metaDescription: string;
  title: string;
  lede: string;
}

/** One of the full-height panels of /about (see about/page.tsx). */
export interface AboutPanelText {
  /** mono eyebrow above the headline — "01 — …" */
  eyebrow: string;
  /** the serif headline, split so the middle run can be set in italic */
  headline: { pre: string; em: string; post: string };
  body: string;
  /** mono meta line under the body (discipline · place · tools) */
  meta?: string;
  /** alt text for the panel's cut-out photo */
  figureAlt: string;
}

/** The tech panel: the copy, plus the two links into the site's own work. */
export interface AboutPathText extends AboutPanelText {
  /** the link row under the copy — into /websites and /xperiments */
  links: { websites: string; xperiments: string };
}

/** The calisthenics panel: the bio, what the coaching covers, a way to the contacts. */
export interface AboutDisciplineText extends AboutPanelText {
  /** mono label over the coaching list */
  coachingLabel: string;
  /** one row per specialty: the term, then a one-line detail */
  coaching: { term: string; detail: string }[];
  /** the link down to the contact panel (`#contact`) */
  cta: string;
}

/** The contact panel that closes /about — every way to reach out, in one list. */
export interface AboutContactText {
  eyebrow: string;
  headline: { pre: string; em: string; post: string };
  body: string;
  /** mono row labels; the values themselves are brand tokens (CONTACT) */
  labels: { email: string; phone: string; instagram: string; where: string };
  /** the place, spelled out — the one row that is not a link */
  where: string;
  /** mono note under the rows (response time · languages) */
  note: string;
}

export interface Dictionary {
  /** document-level metadata (title stays a brand token) */
  meta: {
    description: string;
  };
  nav: {
    skip: string;
    work: string;
    about: string;
    contact: string;
    /** aria-label for the topbar <nav> landmark */
    primary: string;
    /** the three work routes, spelled out in the topbar */
    websites: string;
    graphic: string;
    xperiments: string;
  };
  locale: {
    /** aria-label for the toggle group */
    label: string;
    /** spoken names for the two buttons */
    en: string;
    it: string;
  };
  hero: {
    eyebrow: string;
    lede: string;
  };
  loader: {
    /** lowercase tag shown beside the progress counter on the loading veil */
    tag: string;
  };
  /** the section teasers revealed by scrolling past the hero on the home page */
  home: {
    /** aria-label for the teaser nav landmark */
    aria: string;
    /** mono cue under every teaser label */
    cue: string;
    teasers: {
      websites: string;
      graphic: string;
      xperiments: string;
    };
  };
  work: {
    /** section landmark label */
    aria: string;
    /** visible label per section, keyed by section id (see WORK_SECTIONS) */
    sections: Record<string, string>;
    items: Record<string, WorkText>;
  };
  about: {
    label: string;
    metaTitle: string;
    metaDescription: string;
    title: string;
    /** aria-label for the 01 / 02 / 03 panel pager */
    pagerAria: string;
    /** mono cue at the foot of the first panel */
    scrollCue: string;
    /** the three full-height panels: the degree + tech path, the discipline + coaching, the contacts */
    panels: {
      path: AboutPathText;
      discipline: AboutDisciplineText;
      contact: AboutContactText;
    };
  };
  /** the /websites index */
  websites: PageText;
  /** the /xperiments index */
  xperiments: PageText;
  footer: {
    vat: string;
    /** the link to /about's contact panel — its text, an arrow follows it */
    contact: string;
    /** the Instagram link's text — the app's glyph follows it (no arrow) */
    instagram: string;
    /** the phone link's display form; the number itself is a brand token */
    phone: string;
    /** aria-label for the phone link ("call" / "chiama") */
    phoneLabel: string;
  };
  /** route-level error boundary for the main site (boundary-copy.ts) */
  error: ErrorText;
  /** the /graphic-designs index */
  gd: {
    metaTitle: string;
    metaDescription: string;
    back: string;
    label: string;
    title: string;
    lede: string;
    /** call to action on each demo card */
    cta: string;
    /** per-demo copy, keyed by demo id (see the DEMOS list on that page) */
    demos: Record<string, DemoText>;
  };
}

const en: Dictionary = {
  meta: {
    description:
      "Creative technologist & full-stack developer in Turin — high-performance web interfaces and real-time generative visuals, for screens and LED walls alike.",
  },
  nav: {
    skip: "skip to content",
    work: "work",
    about: "about",
    contact: "contact",
    primary: "primary",
    websites: "websites",
    graphic: "graphic designs",
    xperiments: "xperiments",
  },
  locale: {
    label: "language",
    en: "English",
    it: "Italian",
  },
  hero: {
    eyebrow: "full-stack developer & creative technologist based in Turin",
    lede: "I build high-performance web interfaces and generative visuals — where robust code meets real-time graphics, for screens and LED walls alike.",
  },
  loader: { tag: LOADER_TAG.en },
  home: {
    aria: "Sections",
    cue: "open",
    teasers: {
      websites: "Websites",
      graphic: "Merge Graphic Designs",
      xperiments: "XPERIMENTS",
    },
  },
  work: {
    aria: "Work",
    sections: {
      websites: "websites",
      graphic: "graphic design",
      experiments: "xperiments",
    },
    items: {
      "vini-montarello": {
        meta: "web · 2025",
        description:
          "Winery brand & e-commerce. Full-stack build, slow scroll, product as ritual.",
        cue: "visit site",
        alt: "Vini Montarello homepage — vineyards in the Monferrato hills behind the winery's wordmark",
      },
      "toretto-blend": {
        meta: "web · 2024",
        description:
          "Spirits brand site — Mediterranean meets Jamaica. Cinematic video hero, age gate, drinks & stockists.",
        cue: "visit site",
        alt: "Toretto Blend homepage — the embossed bottle label lit in amber, reading RUM Jamaica & Liquore ai fiori d'arancio",
      },
      "merge-graphic-designs": {
        meta: "graphic · 2025",
        description:
          "Selected graphic design — identities, posters, type. A merged set, viewable in one place.",
        cue: "open gallery",
      },
      "liminal-field": {
        meta: "installation · led · 2025",
        description:
          "Real-time generative loop for a 6×3m LED wall — domain-warped noise field, painted live by the shared WebGL canvas.",
        cue: "live · webgl",
      },
      "aura-loops": {
        meta: "generative · touchdesigner · 2024",
        description:
          "Seamless ambient loops, prototyped in shader and finished in TouchDesigner for the install.",
        cue: "live · webgl",
      },
      "studio-next": {
        meta: "web · soon",
        description:
          "Physics-based web experience, in progress — Next.js + React Three Fiber.",
        cue: "coming soon",
      },
    },
  },
  about: {
    label: "about",
    metaTitle: "About",
    metaDescription:
      "Creative technologist and full-stack developer in Turin, calisthenics endurance athlete and coach — and every way to get in touch.",
    title: "About",
    pagerAria: "Page sections",
    scrollCue: "scroll",
    panels: {
      path: {
        eyebrow: "01 — path",
        headline: {
          pre: "Computer Science graduate, ",
          em: "creative technologist",
          post: " by vocation.",
        },
        body: "University of Turin, 2025. I work at the seam between web engineering and immersive visuals: full-stack sites that perform, real-time interfaces, generative loops for LED walls. I make sites that perform and installations that breathe — and this one runs my own generative work, live, as the proof.",
        meta: "turin · full-stack · webgl · touchdesigner",
        figureAlt:
          "Alberto Marocco on graduation day — laurel wreath, thesis in hand",
        links: { websites: "the websites", xperiments: "the experiments" },
      },
      discipline: {
        eyebrow: "02 — calisthenics",
        headline: {
          pre: "Endurance athlete, ",
          em: "coach",
          post: " by conviction.",
        },
        body: "Off the screen I compete in calisthenics, Endurance discipline: max-rep sets and timed rounds, won with pacing and a technique that never slips. I train, I compete, and I coach a small group of athletes at every level — from the first clean pull-up to a competition prep.",
        meta: "endurance · turin · athlete & coach",
        figureAlt:
          "Alberto Marocco holding a planche on the parallettes at a calisthenics competition",
        coachingLabel: "coaching",
        coaching: [
          {
            term: "endurance",
            detail: "Competition prep, pacing, rep density.",
          },
          {
            term: "foundations",
            detail: "First pull-up, first dip: technique before volume.",
          },
          {
            term: "programming",
            detail: "Tailored plans, in Turin or online.",
          },
        ],
        cta: "get in touch",
      },
      contact: {
        eyebrow: "03 — contact",
        headline: {
          pre: "Write, call, ",
          em: "find me",
          post: ".",
        },
        body: "Open to collaborations and commissions from 2026 — web, installations, LED — and to new athletes to coach. One message is enough.",
        labels: {
          email: "email",
          phone: "phone",
          instagram: "instagram",
          where: "based in",
        },
        where: "Turin, Italy",
        note: "replies within a couple of days · en / it",
      },
    },
  },
  websites: {
    metaTitle: "Websites",
    metaDescription:
      "Full-stack websites — design, code and motion in one pass. Built to a performance budget, never from a template.",
    title: "Websites",
    lede: "Sites built end to end — design, code and motion in one pass. Slow scroll, real performance budgets, no template underneath.",
  },
  xperiments: {
    metaTitle: "XPERIMENTS",
    metaDescription:
      "Real-time generative work — shaders, LED walls, installations, each one painted live in the browser.",
    title: "XPERIMENTS",
    lede: "Real-time generative work — shaders, LED walls, installations. Each one is painted live by the shared WebGL canvas: open a row to watch it run.",
  },
  footer: {
    vat: "P.IVA — placeholder",
    contact: "contact",
    instagram: "instagram",
    phone: CONTACT.telDisplay,
    phoneLabel: "call",
  },
  error: ERROR_COPY.en,
  gd: {
    metaTitle: "Merge — Graphic Designs",
    metaDescription:
      "Selected graphic work, merged into interactive demos. Open one to explore it in the browser.",
    back: "← back",
    label: "graphic design",
    title: "Merge — Graphic Designs",
    lede: "Selected graphic work, merged into interactive demos. Open one to explore it.",
    cta: "enter demo",
    demos: {
      vortex: {
        title: "Image Vortex",
        meta: "interactive · webgl · 2026",
        desc: "A rotating vortex of graphic work. Pick a card, spin the carousel of selections, then open the scattered gallery.",
      },
      tarassaco: {
        title: "Tarassaco — Dandelion Wind",
        meta: "interactive · breath + face · 2026",
        desc: "Blow into your microphone and an editorial poem scatters like dandelion seeds — breath and face tracked live, entirely in your browser.",
      },
      darkroom: {
        title: "Camera Oscura — Darkroom",
        meta: "interactive · fluid + shader · 2026",
        desc: "A developing tray in the dark. Stir the liquid with your pointer and the prints surface where it has passed — a GPU fluid simulation developing photographs, live in your browser.",
      },
      hands: {
        title: "Mani — Hands",
        meta: "interactive · hand tracking · 2026",
        desc: "Your hands, read by the webcam. Pinch a print out of the drift, carry it, tear it in two with both hands — nothing leaves your browser.",
      },
      wall: {
        title: "Parete — LED Wall",
        meta: "3d preview · led wall · 2026",
        desc: "A 6 × 3 m LED wall in a dark room, running the generative loops live. Walk around it, switch loops, get close enough to see the pixel pitch.",
      },
    },
  },
};

const it: Dictionary = {
  meta: {
    description:
      "Creative technologist & full-stack developer a Torino — interfacce web ad alte prestazioni e visual generative in tempo reale, per schermi e led wall.",
  },
  nav: {
    skip: "salta al contenuto",
    work: "lavori",
    about: "about",
    contact: "contatti",
    primary: "principale",
    websites: "siti",
    graphic: "graphic designs",
    xperiments: "xperiments",
  },
  locale: {
    label: "lingua",
    en: "Inglese",
    it: "Italiano",
  },
  hero: {
    eyebrow: "full-stack developer & creative technologist, da torino",
    lede: "Costruisco interfacce web ad alte prestazioni e visual generative — dove il codice solido incontra la grafica in tempo reale, per schermi e led wall.",
  },
  loader: { tag: LOADER_TAG.it },
  home: {
    aria: "Sezioni",
    cue: "apri",
    teasers: {
      websites: "Siti web",
      graphic: "Merge Graphic Designs",
      xperiments: "XPERIMENTS",
    },
  },
  work: {
    aria: "Lavori",
    sections: {
      websites: "siti web",
      graphic: "graphic design",
      experiments: "xperiments",
    },
    items: {
      "vini-montarello": {
        meta: "web · 2025",
        description:
          "Brand vinicolo & e-commerce. Sviluppo full-stack, scroll lento, il prodotto come rito.",
        cue: "visita il sito",
        alt: "Homepage di Vini Montarello — i vigneti delle colline del Monferrato dietro il logotipo della cantina",
      },
      "toretto-blend": {
        meta: "web · 2024",
        description:
          "Sito di brand per uno spirit — il Mediterraneo che incontra la Giamaica. Hero video cinematografico, age gate, drink e punti vendita.",
        cue: "visita il sito",
        alt: "Homepage di Toretto Blend — l'etichetta in rilievo della bottiglia illuminata d'ambra, con la scritta RUM Jamaica & Liquore ai fiori d'arancio",
      },
      "merge-graphic-designs": {
        meta: "grafica · 2025",
        description:
          "Grafica selezionata — identità, manifesti, caratteri. Una raccolta unica, da sfogliare in un solo posto.",
        cue: "apri la gallery",
      },
      "liminal-field": {
        meta: "installazione · led · 2025",
        description:
          "Loop generativo in tempo reale per un led wall 6×3m — campo di noise domain-warped, dipinto dal vivo dal canvas WebGL condiviso.",
        cue: "live · webgl",
      },
      "aura-loops": {
        meta: "generativa · touchdesigner · 2024",
        description:
          "Loop ambient continui, prototipati in shader e rifiniti in TouchDesigner per l'installazione.",
        cue: "live · webgl",
      },
      "studio-next": {
        meta: "web · presto",
        description:
          "Esperienza web basata sulla fisica, in lavorazione — Next.js + React Three Fiber.",
        cue: "in arrivo",
      },
    },
  },
  about: {
    label: "about",
    metaTitle: "About",
    metaDescription:
      "Creative technologist e full-stack developer a Torino, atleta di calisthenics endurance e coach — e tutti i modi per mettersi in contatto.",
    title: "About",
    pagerAria: "Sezioni della pagina",
    scrollCue: "scorri",
    panels: {
      path: {
        eyebrow: "01 — percorso",
        headline: {
          pre: "Laureato in Informatica, ",
          em: "creative technologist",
          post: " per vocazione.",
        },
        body: "Università di Torino, 2025. Lavoro nel punto d'incontro tra ingegneria web e visual immersive: siti full-stack che rendono, interfacce in tempo reale, loop generativi per led wall. Realizzo siti che rendono e installazioni che respirano — e questo sito manda in scena dal vivo il mio lavoro generativo: è la prova.",
        meta: "torino · full-stack · webgl · touchdesigner",
        figureAlt:
          "Alberto Marocco il giorno della laurea — corona d'alloro, tesi in mano",
        links: { websites: "i siti web", xperiments: "gli xperiments" },
      },
      discipline: {
        eyebrow: "02 — calisthenics",
        headline: {
          pre: "Atleta di endurance, ",
          em: "coach",
          post: " per convinzione.",
        },
        body: "Fuori dallo schermo gareggio nel calisthenics, disciplina Endurance: serie massimali e round a tempo, vinti con il ritmo e con una tecnica che non cede. Mi alleno, gareggio e seguo un piccolo gruppo di atleti di ogni livello — dalla prima trazione pulita alla preparazione di una gara.",
        meta: "endurance · torino · atleta & coach",
        figureAlt:
          "Alberto Marocco in planche sulle parallele, durante una gara di calisthenics",
        coachingLabel: "coaching",
        coaching: [
          {
            term: "endurance",
            detail: "Preparazione gare, ritmo, densità di ripetizioni.",
          },
          {
            term: "basi",
            detail: "Prima trazione, primo dip: tecnica prima del volume.",
          },
          {
            term: "programmazione",
            detail: "Piani su misura, a Torino oppure online.",
          },
        ],
        cta: "parliamone",
      },
      contact: {
        eyebrow: "03 — contatti",
        headline: {
          pre: "Scrivimi, chiamami, ",
          em: "trovami",
          post: ".",
        },
        body: "Aperto a collaborazioni e commissioni dal 2026 — web, installazioni, led — e a nuovi atleti da seguire. Basta un messaggio.",
        labels: {
          email: "email",
          phone: "telefono",
          instagram: "instagram",
          where: "dove",
        },
        where: "Torino, Italia",
        note: "rispondo entro un paio di giorni · it / en",
      },
    },
  },
  websites: {
    metaTitle: "Siti web",
    metaDescription:
      "Siti full-stack — design, codice e motion in un unico passaggio. Costruiti su un budget di performance, mai da un template.",
    title: "Siti web",
    lede: "Siti costruiti da capo a fondo — design, codice e motion in un unico passaggio. Scroll lento, budget di performance veri, nessun template sotto.",
  },
  xperiments: {
    metaTitle: "XPERIMENTS",
    metaDescription:
      "Lavoro generativo in tempo reale — shader, led wall, installazioni, dipinti dal vivo nel browser.",
    title: "XPERIMENTS",
    lede: "Lavoro generativo in tempo reale — shader, led wall, installazioni. Ognuno è dipinto dal vivo dal canvas WebGL condiviso: apri una riga per vederlo girare.",
  },
  footer: {
    vat: "P.IVA — placeholder",
    contact: "contatti",
    instagram: "instagram",
    phone: CONTACT.telDisplay,
    phoneLabel: "chiama",
  },
  error: ERROR_COPY.it,
  gd: {
    metaTitle: "Merge — Graphic Designs",
    metaDescription:
      "Una selezione di lavori grafici, riuniti in demo interattive. Aprine una per esplorarla nel browser.",
    back: "← indietro",
    label: "graphic design",
    title: "Merge — Graphic Designs",
    lede: "Una selezione di lavori grafici, riuniti in demo interattive. Aprine una per esplorarla.",
    cta: "entra nella demo",
    demos: {
      vortex: {
        title: "Image Vortex",
        meta: "interattivo · webgl · 2026",
        desc: "Un vortice rotante di lavori grafici. Scegli una carta, fai girare il carosello delle selezioni, poi apri la gallery sparsa nello spazio.",
      },
      tarassaco: {
        title: "Tarassaco — Dandelion Wind",
        meta: "interattivo · fiato + volto · 2026",
        desc: "Soffia nel microfono e una poesia editoriale si disperde come i semi di un tarassaco — fiato e volto tracciati dal vivo, tutto nel tuo browser.",
      },
      darkroom: {
        title: "Camera Oscura — Darkroom",
        meta: "interattivo · fluido + shader · 2026",
        desc: "Una bacinella di sviluppo al buio. Muovi il liquido con il puntatore e le stampe affiorano dove è passato — una simulazione di fluido su GPU che sviluppa fotografie, dal vivo nel tuo browser.",
      },
      hands: {
        title: "Mani — Hands",
        meta: "interattivo · tracciamento mani · 2026",
        desc: "Le tue mani, lette dalla webcam. Pizzica una stampa dalla deriva, portala con te, strappala in due con entrambe le mani — niente esce dal tuo browser.",
      },
      wall: {
        title: "Parete — LED Wall",
        meta: "anteprima 3d · led wall · 2026",
        desc: "Un led wall di 6 × 3 m in una stanza buia, con i loop generativi che girano dal vivo. Giraci intorno, cambia loop, avvicinati fino a vedere il pixel pitch.",
      },
    },
  },
};

const dictionaries: Record<Locale, Dictionary> = { en, it };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
