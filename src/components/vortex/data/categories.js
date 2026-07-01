/**
 * CATEGORIES DATA
 *
 * 36 category objects — one per card in the vortex.
 * Layout: 6 rings × 6 cards. Ring 0 (top/largest) holds MOD_001–MOD_006,
 * Ring 1 holds MOD_007–MOD_012, … Ring 5 (bottom/smallest) holds MOD_031–MOD_036.
 *
 * Each object:
 *   id      — unique identifier used as React key and for store lookups
 *   name    — display label rendered on the card texture
 *   color   — hex background color of the card (also used as emissive tint)
 */

export const CATEGORIES = [

  // ── Ring 0 — warm spectrum ────────────────────────────────────────
  { id: 'MOD_001', name: 'Wild Animals',       color: '#FF6B2B' },
  { id: 'MOD_002', name: 'Ocean Life',         color: '#0288D1' },
  { id: 'MOD_003', name: 'Space Exploration',  color: '#1565C0' },
  { id: 'MOD_004', name: 'Rainforest',         color: '#2E7D32' },
  { id: 'MOD_005', name: 'Arctic & Polar',     color: '#00ACC1' },
  { id: 'MOD_006', name: 'Deep Sea',           color: '#1A237E' },

  // ── Ring 1 — ancient worlds ───────────────────────────────────────
  { id: 'MOD_007', name: 'Ancient Rome',       color: '#E53935' },
  { id: 'MOD_008', name: 'Ancient Greece',     color: '#1976D2' },
  { id: 'MOD_009', name: 'Ancient Egypt',      color: '#F9A825' },
  { id: 'MOD_010', name: 'Ancient Maya',       color: '#9E9D24' },
  { id: 'MOD_011', name: 'Vikings',            color: '#546E7A' },
  { id: 'MOD_012', name: 'Medieval Knights',   color: '#6D4C41' },

  // ── Ring 2 — arts & culture ───────────────────────────────────────
  { id: 'MOD_013', name: 'Renaissance Art',    color: '#C8972E' },
  { id: 'MOD_014', name: 'Baroque Music',      color: '#8D6E63' },
  { id: 'MOD_015', name: 'Ballet',             color: '#EC407A' },
  { id: 'MOD_016', name: 'Jazz & Blues',       color: '#E65100' },
  { id: 'MOD_017', name: 'Hip Hop Culture',    color: '#FDD835' },
  { id: 'MOD_018', name: 'Rock & Roll',        color: '#78909C' },

  // ── Ring 3 — sport & action ───────────────────────────────────────
  { id: 'MOD_019', name: 'Soccer',             color: '#00C853' },
  { id: 'MOD_020', name: 'Formula 1',          color: '#FF1744' },
  { id: 'MOD_021', name: 'Martial Arts',       color: '#880E4F' },
  { id: 'MOD_022', name: 'Samurai Japan',      color: '#C62828' },
  { id: 'MOD_023', name: 'Street Art',         color: '#F50057' },
  { id: 'MOD_024', name: 'Street Food',        color: '#FFA000' },

  // ── Ring 4 — fantasy & sci-fi ─────────────────────────────────────
  { id: 'MOD_025', name: 'Cyberpunk',          color: '#D500F9' },
  { id: 'MOD_026', name: 'Neon Tokyo',         color: '#00E5FF' },
  { id: 'MOD_027', name: 'Steampunk',          color: '#BF6000' },
  { id: 'MOD_028', name: 'Fantasy Dragons',    color: '#6A1B9A' },
  { id: 'MOD_029', name: 'Mythological Creatures', color: '#7C4DFF' },
  { id: 'MOD_030', name: 'Gothic Architecture', color: '#4527A0' },

  // ── Ring 5 — earth & time ─────────────────────────────────────────
  { id: 'MOD_031', name: 'Dinosaurs',          color: '#558B2F' },
  { id: 'MOD_032', name: 'Volcanoes',          color: '#FF6F00' },
  { id: 'MOD_033', name: 'Vintage Posters',    color: '#AD1457' },
  { id: 'MOD_034', name: 'Noir Cinema',        color: '#607D8B' },
  { id: 'MOD_035', name: 'Bonsai & Zen',       color: '#43A047' },
  { id: 'MOD_036', name: 'Carnival & Fiesta',  color: '#E91E63' },

];
