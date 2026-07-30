import type { Locale } from "@/lib/dictionary";

/**
 * All translatable text for the Tarassaco demo, keyed by locale.
 *
 * Kept here rather than in the site dictionary: this is a self-contained port
 * with its own editorial vocabulary (and a poem), and the tree that renders it
 * is client-only (`ssr: false`), so the strings come down from `page.tsx` as one
 * prop. Same cookie + dictionary approach as the rest of the site — typing both
 * entries as `TarassacoCopy` keeps EN/IT parity compiler-enforced.
 *
 * The piece's own name — "Tarassaco", "Dandelion Wind" — is a title, not copy,
 * and stays as-is in both locales.
 */
export interface TarassacoCopy {
  metaTitle: string;
  metaDescription: string;
  /** persistent chrome */
  exit: string;
  /** gate */
  enable: string;
  initializing: string;
  privacy: string;
  /** the word the intro progress bar resolves into */
  intro: string;
  /** the two wind tutorials */
  west: string;
  east: string;
  blowLeft: string;
  blowRight: string;
  /** hint beside the locked dandelion in the main scene */
  blow: string;
  /** the main scene's poem */
  poem: string;
  /** sensor failure dialog */
  errTimeout: string;
  errDenied: string;
  errBody: string;
  errButton: string;
  /** persistent hint once keyboard mode is on */
  keyboardHint: string;
}

const en: TarassacoCopy = {
  metaTitle: "Tarassaco — Dandelion Wind",
  metaDescription:
    "Blow into your microphone to scatter the text like dandelion seeds. An interactive editorial experiment that runs entirely in your browser — nothing is recorded or sent anywhere.",
  exit: "← exit the demo",
  enable: "CLICK TO ENABLE",
  initializing: "INITIALIZING",
  privacy:
    "Camera & microphone are processed locally in your browser. Nothing is recorded, stored or sent anywhere.",
  intro: "BLOW",
  west: "The West Wind awakens. It sweeps across the void, pushing the dark towards the dawn.",
  east: "The East Wind replies. A counter-breath from the horizon, restoring balance to the scattered light.",
  blowLeft: "← blow on the left",
  blowRight: "blow on the right →",
  blow: "blow",
  poem: `In the silent theater of the cosmos, the dandelion stands as a fragile monument to endurance. A delicate architecture of silver threads, it waits for the inevitable breath of change. It does not resist the gale; it embraces the fracture. Each seed, a microscopic vessel of potential, is tethered by the thinnest of margins, anticipating the moment of release. When the wind arrives, the structure shatters, not in defeat, but in a spectacular dispersal. The seeds scatter across the dark canvas, navigating chaotic currents, carrying the ghost of their origin to distant, unseen soils. This is the paradox of the dandelion: its destruction is its propagation. To blow upon it is not to end its life, but to begin a hundred others. The glow of its fragile crown is a beacon in the dark, a silent promise that even when torn apart, the pieces will find a place to root, to rise, and to bloom once more in the endless cycle of the wind.`,
  errTimeout: "The sensors aren't responding",
  errDenied: "Camera or microphone unavailable",
  errBody:
    "Allow the camera and microphone to blow for real — or carry on with the keyboard.",
  errButton: "Continue — press SPACE to blow",
  keyboardHint: "press SPACE to blow",
};

const it: TarassacoCopy = {
  metaTitle: "Tarassaco — Dandelion Wind",
  metaDescription:
    "Soffia nel microfono per disperdere il testo come i semi di un tarassaco. Un esperimento editoriale interattivo che gira tutto nel tuo browser — niente viene registrato o inviato da nessuna parte.",
  exit: "← esci dalla demo",
  enable: "CLICCA PER ATTIVARE",
  initializing: "INIZIALIZZO",
  privacy:
    "Fotocamera e microfono vengono elaborati in locale, nel tuo browser. Niente viene registrato, salvato o inviato da nessuna parte.",
  intro: "SOFFIA",
  west: "Il Vento di Ponente si sveglia. Spazza il vuoto e spinge il buio verso l'alba.",
  east: "Il Vento di Levante risponde. Un contro-respiro dall'orizzonte, che restituisce equilibrio alla luce dispersa.",
  blowLeft: "← soffia a sinistra",
  blowRight: "soffia a destra →",
  blow: "soffia",
  poem: `Nel teatro silenzioso del cosmo, il tarassaco si erge come fragile monumento alla resistenza. Delicata architettura di fili d'argento, attende l'inevitabile soffio del cambiamento. Non resiste alla raffica: abbraccia la frattura. Ogni seme, minuscolo vascello di possibilità, è trattenuto dal più sottile dei margini, in attesa dell'istante del distacco. Quando il vento arriva, la struttura si spezza, non per sconfitta, ma in una dispersione spettacolare. I semi si spargono sulla tela scura, navigano correnti caotiche, portano il fantasma della loro origine verso terre lontane e invisibili. È il paradosso del tarassaco: la sua distruzione è la sua propagazione. Soffiarci sopra non è porre fine a una vita, ma dare inizio ad altre cento. Il bagliore della sua corona fragile è un faro nel buio, la promessa silenziosa che anche fatti a pezzi i frammenti troveranno un luogo dove radicarsi, risalire e fiorire ancora nel ciclo infinito del vento.`,
  errTimeout: "I sensori non rispondono",
  errDenied: "Fotocamera o microfono non disponibili",
  errBody:
    "Consenti fotocamera e microfono per soffiare davvero — oppure continua con la tastiera.",
  errButton: "Continua — premi SPAZIO per soffiare",
  keyboardHint: "premi SPAZIO per soffiare",
};

export const TARASSACO_COPY: Record<Locale, TarassacoCopy> = { en, it };
