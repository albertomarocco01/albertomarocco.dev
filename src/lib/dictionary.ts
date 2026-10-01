// Hand-rolled EN/IT localization. No i18n library and no locale in the URL:
// the active locale is a `locale` cookie (defaulting to Italian, the site's
// primary language), which src/proxy.ts turns into the hidden `[locale]` root
// segment, and the matching dictionary is threaded to components as a prop. Proper nouns and tech/brand
// tokens (names, "webgl", "touchdesigner", "led", years, the email, the domain,
// "P.IVA") stay untranslated on purpose.
//
// This module is deliberately free of `next/root-params`. `getLocale()`, which
// reads the `[locale]` segment and is server-only, lives in ./i18n.ts — which re-exports
// everything here, so `@/lib/i18n` stays the single import for server code.
// The locale primitives (./locale.ts) and the few strings the client-only
// route fallbacks need (./boundary-copy.ts) are split out and re-exported: an
// error boundary loads with its segment on every page, and importing the
// dictionaries there shipped both of them, in full, to every visitor.
//
// Every key here has a consumer: the `Dictionary` type forces each string into
// both languages, so a key nobody reads costs a translation for nothing — when
// a component stops reading one, delete it here too (the error boundaries read
// ERROR_COPY from ./boundary-copy directly, so it is not mirrored here).
//
// The five immersive demos under /graphic-designs keep their copy next to
// themselves (see (immersive)/graphic-designs/*/copy.ts) — same cookie +
// dictionary approach, typed against
// `Locale` so parity is still compiler-enforced, but their vocabulary is their
// own and doesn't belong in the site dictionary.

import type { Locale } from "./locale";
import { LOADER_TAG } from "./boundary-copy";
import { CONTACT } from "./contact";

export { DEFAULT_LOCALE, OG_LOCALE, isLocale } from "./locale";
export type { Locale } from "./locale";

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
    /** the four routes, spelled out in the topbar */
    websites: string;
    graphic: string;
    xperiments: string;
    about: string;
    /** aria-label for the topbar <nav> landmark */
    primary: string;
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
  /** the rows of /websites and /xperiments, keyed by work id (see lib/work.ts) */
  work: {
    items: Record<string, WorkText>;
  };
  /** /about has no visible title: the three panels carry their own headlines */
  about: {
    metaTitle: string;
    metaDescription: string;
    /** aria-label for the 01 / 02 / 03 panel pager */
    pagerAria: string;
    /** accessible name of one pager button, followed by its index: "section 01" */
    pagerItem: string;
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
    /** the P.IVA line; unset until the real number exists (DECISIONS: NEED REAL VALUES) */
    vat?: string;
    /** the link to /about's contact panel — its text, an arrow follows it */
    contact: string;
    /** the Instagram link's text — the app's glyph follows it (no arrow) */
    instagram: string;
    /** the phone link's display form; the number itself is a brand token */
    phone: string;
    /** aria-label for the phone link ("call" / "chiama") */
    phoneLabel: string;
  };
  /** the site's 404 (app/not-found.tsx) */
  notFound: {
    /** mono label over the title — the status code, same in both locales */
    label: string;
    title: string;
    body: string;
    /** the two ways onward: the home, and the demo index */
    home: string;
    demos: string;
    /** aria-label for that little nav */
    navAria: string;
  };
  /** the /graphic-designs index */
  gd: {
    /** the <title> form of the name — a middle dot, so the layout's " — " suffix never makes three dashes */
    metaTitle: string;
    metaDescription: string;
    /** mono section label over the title (plural, like the nav) */
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
    websites: "websites",
    graphic: "merge//designs",
    xperiments: "xperiments",
    about: "about",
    primary: "primary",
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
      graphic: "Merge — Graphic Designs",
      xperiments: "XPERIMENTS",
    },
  },
  work: {
    items: {
      baldisport: {
        meta: "web · 2026",
        description:
          "Sports association in Baldissero Torinese. The whole stack behind the site — membership management back office and online payment system included.",
        cue: "visit site",
      },
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
    metaTitle: "About",
    metaDescription:
      "I'm Alberto Marocco: I build websites in Turin and play with real-time graphics. I also compete in calisthenics and coach. Here's how to reach me.",
    pagerAria: "Page sections",
    pagerItem: "section",
    scrollCue: "scroll",
    panels: {
      path: {
        eyebrow: "01 — path",
        headline: {
          pre: "Hi, I'm ",
          em: "Alberto",
          post: ".",
        },
        body: "I graduated in Computer Science in Turin in 2025. These days I build websites and spend a lot of time playing with real-time graphics: shaders, interfaces you move with your hands, visuals for LED walls. The light behind this text is something I made too, and it's a good example of what I enjoy doing.",
        meta: "turin · websites · webgl · touchdesigner",
        figureAlt:
          "Alberto Marocco on graduation day — laurel wreath, thesis in hand",
        links: { websites: "the websites", xperiments: "the xperiments" },
      },
      discipline: {
        eyebrow: "02 — calisthenics",
        headline: {
          pre: "Then there's ",
          em: "calisthenics",
          post: ".",
        },
        body: "When I'm not at the computer, I train. I compete in calisthenics endurance, where you have to keep your pace and your technique right up to the last rep. I also coach a few people, in Turin and online.",
        meta: "endurance · turin · athlete and coach",
        figureAlt:
          "Alberto Marocco on the dip bars during a calisthenics competition",
        coachingLabel: "coaching",
        coaching: [
          {
            term: "endurance",
            detail: "Getting ready for a competition: pacing, volume, handling fatigue.",
          },
          {
            term: "basics",
            detail: "Starting from zero: the first pull-up, the first dip.",
          },
          {
            term: "plans",
            detail: "Training plans made for you, in person in Turin or online.",
          },
        ],
        cta: "get in touch",
      },
      contact: {
        eyebrow: "03 — contact",
        headline: {
          pre: "Got an idea? ",
          em: "Drop me a line",
          post: ".",
        },
        body: "Whether it's a website, an installation or you want to start training, you'll find me here. A couple of lines is plenty.",
        labels: {
          email: "email",
          phone: "phone",
          instagram: "instagram",
          where: "where",
        },
        where: "Turin, Italy",
        note: "I usually reply within a couple of days · it / en",
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
    contact: "contact",
    instagram: "instagram",
    phone: CONTACT.telDisplay,
    phoneLabel: "call",
  },
  notFound: {
    label: "404",
    title: "This page does not exist.",
    body: "The address may be mistyped, or the page has moved. The work and the demos are still where they were.",
    home: "← back home",
    demos: "the graphic designs →",
    navAria: "Where to go next",
  },
  gd: {
    metaTitle: "Merge · Graphic Designs",
    metaDescription:
      "Selected graphic work, merged into interactive demos. Open one to explore it in the browser.",
    label: "graphic designs",
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
        desc: "A developing tray in the dark. Stir the liquid with your pointer and the prints surface where it has passed — or leave it alone and it develops by itself, each print sinking into the next.",
      },
      hands: {
        title: "Mani — Hands",
        meta: "interactive · hand tracking · 2026",
        desc: "Your hands, read by the webcam. Pinch a print out of the drift, tear it in two with both hands, close your hand on one and it opens at the centre — nothing leaves your browser.",
      },
      wall: {
        title: "Parete — LED Wall",
        meta: "3d preview · led wall · 2026",
        desc: "A 6 × 3 m LED wall in a dark room, running a generative loop live. Walk round the back to the cabinets and the cabling, switch palettes, or take the tour that shows what an LED wall is made of.",
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
    websites: "siti web",
    graphic: "merge//designs",
    xperiments: "xperiments",
    about: "chi sono",
    primary: "principale",
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
      graphic: "Merge — Graphic Designs",
      xperiments: "XPERIMENTS",
    },
  },
  work: {
    items: {
      baldisport: {
        meta: "web · 2026",
        description:
          "Associazione sportiva di Baldissero Torinese. Tutto quello che c'è dietro al sito — gestionale per iscrizioni e soci e sistema di pagamenti online inclusi.",
        cue: "visita il sito",
      },
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
    metaTitle: "Chi sono",
    metaDescription:
      "Sono Alberto Marocco: faccio siti web a Torino e sperimento con la grafica in tempo reale. Gareggio e alleno nella calisthenics. Qui trovi come contattarmi.",
    pagerAria: "Sezioni della pagina",
    pagerItem: "sezione",
    scrollCue: "scorri",
    panels: {
      path: {
        eyebrow: "01 — percorso",
        headline: {
          pre: "Ciao, sono ",
          em: "Alberto",
          post: ".",
        },
        body: "Mi sono laureato in Informatica a Torino nel 2025. Oggi faccio siti web e passo parecchio tempo a sperimentare con la grafica in tempo reale: shader, interfacce che si muovono con le mani, visual per led wall. Anche la luce dietro a questo testo l'ho fatta io, ed è un buon esempio di quello che mi piace fare.",
        meta: "torino · siti web · webgl · touchdesigner",
        figureAlt:
          "Alberto Marocco il giorno della laurea — corona d'alloro, tesi in mano",
        links: { websites: "i siti web", xperiments: "gli xperiments" },
      },
      discipline: {
        eyebrow: "02 — calisthenics",
        headline: {
          pre: "Poi c'è la ",
          em: "calisthenics",
          post: ".",
        },
        body: "Quando non sono al computer mi alleno. Gareggio nella calisthenics endurance, dove bisogna tenere il ritmo e la tecnica fino all'ultima ripetizione. Seguo anche qualche ragazzo, a Torino e online.",
        meta: "endurance · torino · atleta e coach",
        figureAlt:
          "Alberto Marocco sulle parallele durante una gara di calisthenics",
        coachingLabel: "coaching",
        coaching: [
          {
            term: "endurance",
            detail: "Prepararsi a una gara: ritmo, volume, gestione della fatica.",
          },
          {
            term: "basi",
            detail: "Per chi parte da zero: la prima trazione, il primo dip.",
          },
          {
            term: "schede",
            detail: "Allenamenti pensati per te, dal vivo a Torino o online.",
          },
        ],
        cta: "scrivimi",
      },
      contact: {
        eyebrow: "03 — contatti",
        headline: {
          pre: "Hai un'idea? ",
          em: "Scrivimi",
          post: ".",
        },
        body: "Che sia un sito, un'installazione o vuoi iniziare ad allenarti, mi trovi qui. Bastano due righe.",
        labels: {
          email: "email",
          phone: "telefono",
          instagram: "instagram",
          where: "dove",
        },
        where: "Torino, Italia",
        note: "di solito rispondo in un paio di giorni · it / en",
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
    contact: "contatti",
    instagram: "instagram",
    phone: CONTACT.telDisplay,
    phoneLabel: "chiama",
  },
  notFound: {
    label: "404",
    title: "Questa pagina non esiste.",
    body: "L'indirizzo potrebbe essere sbagliato, o la pagina si è spostata. I lavori e le demo sono ancora al loro posto.",
    home: "← torna alla home",
    demos: "i graphic designs →",
    navAria: "Dove andare",
  },
  gd: {
    metaTitle: "Merge · Graphic Designs",
    metaDescription:
      "Una selezione di lavori grafici, riuniti in demo interattive. Aprine una per esplorarla nel browser.",
    label: "graphic designs",
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
        desc: "Una bacinella di sviluppo al buio. Muovi il liquido con il puntatore e le stampe affiorano dove è passato — oppure lascia fare: si sviluppa da sé, e ogni stampa affonda nella successiva.",
      },
      hands: {
        title: "Mani — Hands",
        meta: "interattivo · tracciamento mani · 2026",
        desc: "Le tue mani, lette dalla webcam. Pizzica una stampa dalla deriva, strappala in due con entrambe le mani, chiudi la mano su una e si apre al centro — niente esce dal tuo browser.",
      },
      wall: {
        title: "Parete — LED Wall",
        meta: "anteprima 3d · led wall · 2026",
        desc: "Un led wall di 6 × 3 m in una stanza buia, con un loop generativo che gira dal vivo. Passa dietro, tra i cabinet e i cavi, cambia palette, o segui il tour che racconta com'è fatto un led wall.",
      },
    },
  },
};

const dictionaries: Record<Locale, Dictionary> = { en, it };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
