/**
 * CONFIGURAZIONE DELLA SCENA — Singola Fonte di Verità
 *
 * Layout del vortice a cilindri concentrici.
 * Molteplici cilindri di raggio diverso approssimativamente alla stessa altezza.
 */

export const SCENE_CONFIG = {

  renderer: {
    antialias:            true, // Attiva l'antialiasing per bordi più morbidi
    toneMapping:          'ACESFilmicToneMapping', // Mappatura dei toni per colori più realistici
    toneMappingExposure:  1.2,  // Livello di esposizione della luce
    backgroundColor:      '#000000', // Colore di sfondo (nero)
    fog: {
      enabled:  true,       // Attiva la nebbia per dare profondità e sfumare nel buio
      color:    '#000000',  // Colore della nebbia (nero)
      near:     20,         // Distanza in cui la nebbia inizia ad agire
      far:      55,         // Distanza in cui la nebbia diventa completamente coprente
    },
  },

  camera: {
    fov:       50,          // Campo visivo (Field of View) della camera
    near:      0.1,         // Distanza minima di rendering
    far:       200,         // Distanza massima di rendering
    position:  [0, 4, 21.5],  // Posizione della camera [asse x destra/sinistra, asse y alto/basso, asse z avanti/indietro]
    target:    [0, 0,  0],  // Punto focale verso cui guarda la camera
    rollAngle: 8,           // Angolo di inclinazione obliquo (rollio) della camera in gradi rispetto al target. Aumentalo per inclinare visivamente l'intero vortice verso sinistra.

    breathing: {
      enabled:     true,    // Attiva il movimento continuo e lento ("respiro") della camera
      xAmplitude:  0.20,    // Ampiezza del movimento sull'asse X
      yAmplitude:  0.12,    // Ampiezza del movimento sull'asse Y
      zAmplitude:  0.06,    // Ampiezza del movimento sull'asse Z
      xSpeed:      0.25,    // Velocità di oscillazione sull'asse X
      ySpeed:      0.35,    // Velocità di oscillazione sull'asse Y
      zSpeed:      0.18,    // Velocità di oscillazione sull'asse Z
    },
  },

  // ── CILINDRI CONCENTRICI ──────────────────────────────────────
  rings: {
    layers: [
      { radius: 8.0,    count: 8,   angularOffset: 0,    baseY: 0.0   },
      { radius: 8.8,   count: 12,  angularOffset: 18,   baseY: -0.15 },
      { radius: 9.6,   count: 15,  angularOffset: 7,    baseY: 0.10  },
      { radius: 10.4,   count: 19,  angularOffset: 10,   baseY: -0.05 },
    ],

    idle: {
      enabled: true,
      speeds: [0.25, -0.20, 0.15, -0.10],
    },
  },

  cards: {
    baseWidth:  2.8,
    minWidth:   1.8,
    maxWidth:   3.2,
    minHeight:  1.6,
    maxHeight:  4.0,

    curvatureAngle:    18,
    curvatureSegments: 10,

    randomOffsets: {
      seed:     42,
      tiltX:    { min: -1.5,  max: 1.5  },
      tiltZ:    { min: -1.0,  max: 1.0  },
      radial:   { min: -0.08, max: 0.08 },
      vertical: { min: -0.25, max: 0.25 },
    },

    floating: {
      enabled:     true,
      frequencyY:  { min: 0.5,  max: 0.9 },
      frequencyZ:  { min: 0.35, max: 0.65 },
      amplitudeY:  0.3,
      amplitudeZ:  0.04,
    },

    material: {
      roughness:         0.4,
      metalness:         0.05,
      emissiveIntensity: 0.0,
      envMapIntensity:   0.4,
    },

    hover: {
      scaleMultiplier: 1.12,
      liftZ:           0.3,
      duration:        0.25,
      ease:            'power2.out',
    },
  },

  // ── ANIMAZIONE DI SELEZIONE E TRANSIZIONE (SCENA 1 → SCENA 2) ───────────────
  selection: {
    carouselCardCount: 8, // Numero di immagini del vortice che formano il carosello

    // ── Le 8 immagini selezionate: volano dalle posizioni del vortice verso l'anello carosello ──
    selected: {
      flyDuration: 3,         // Durata del volo verso le posizioni del carosello
      ease:        'power3.inOut',
    },

    // ── Immagini NON selezionate: cadono nel vuoto e si dissolvono ──
    unselected: {
      fallDuration: 1.2,        // Durata della caduta + dissoluzione
      fallDistance: -18.0,        // Distanza di caduta sull'asse Y (negativo = verso il basso)
      ease:         'power2.in', // Accelerazione gravitazionale naturale
      staggerDelay: 0.03,       // Delay diverso per ogni carta (effetto domino)
    },
  },

  // ── CAROSELLO CIRCOLARE (SCENA 2) ─────────────────────────────
  carousel: {
    radius:        6.0,
    cardScale:     1.3,
    baseY:         0.0,

    // Selezione "Classic Carousel" a scatti
    selectorEase:      'power3.out',
    selectorDuration:  0.8,
    activeCardOffsetZ: 1.2,  // Quanto la card selezionata si avvicina alla camera
    activeCardScale:   1.15, // Scale aggiuntivo per la card selezionata
    autoPlayDelay:     1.2,  // Secondi tra una transizione automatica e l'altra (ridotto per maggiore fluidità)

    // Posizione della camera durante la Scena 2
    cameraPosition:  [0, 2, 17], // Camera allontanata per visuale più ampia
    cameraTarget:    [0, 0, 0],
    cameraDuration:  1.0,        // La camera arriva mentre le carte stanno ancora volando
    cameraEase:      'power2.inOut',
    cameraRollAngle: 0,
  },

  // ── ANIMAZIONE DI RITORNO (SCENA 2 → SCENA 1) ─────────────────
  returnToVortex: {
    fadeInVortex:  2,
    ease:          'power2.out',
    staggerDelay:  0.03,
  },

  // ── SCENA GALLERY (SCENA 3) ───────────────────────────────────
  gallery: {
    backgroundOpacity: 0.20,
    expansionDuration: 1.5,
    cardCount:         6,
    elevationStart:   -12,    // Le card partono da sotto lo schermo
    elevationDuration: 1.4,
    staggerDelay:      0.15,
    cameraPosition:    [0, 0, 12],
    cameraTarget:      [0, 0, 0],

    detailView: {
      duration:       0.8,
      ease:           'power3.inOut',
      targetZ:        4.0,     // Card moves forward to this Z
      targetScale:    1.8,     // Card scales up to this factor
      offFocusOpacity: 0.15,   // Opacity of non-selected cards
    },
  },

  lighting: {
    ambient: {
      color:     '#ffffff',
      intensity: 0.6,
    },

    directional: {
      color:      '#ffffff',
      intensity:  0.8,
      position:   [5, 15, 12],
    },

    pointLights: [
      {
        id:        'top-center',
        color:     '#6699ff',
        intensity: 1.4,
        position:  [0, 15, 0],
        distance:  50,
        decay:     2,
      },
      {
        id:        'left-warm',
        color:     '#ff7744',
        intensity: 0.6,
        position:  [-12, -2, 10],
        distance:  40,
        decay:     2,
      },
      {
        id:        'right-cool',
        color:     '#9955ff',
        intensity: 0.45,
        position:  [12, -3, 10],
        distance:  40,
        decay:     2,
      },
    ],
  },

  postProcessing: {
    enabled: true,
    bloom: {
      threshold:  0.85,
      strength:   0.35,
      radius:     0.5,
    },
    vignette: {
      offset:    0.40,
      darkness:  0.55,
    },
  },
};
