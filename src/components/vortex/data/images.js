/**
 * DATASET IMMAGINI
 *
 * 54 immagini distribuite in 3 categorie (18 per categoria).
 * L'assegnazione è round-robin: indice 0→cat_1, 1→cat_2, 2→cat_3, 3→cat_1, …
 */

// ── Definizione categorie ─────────────────────────────────────────
const CATEGORY_IDS = ['cat_1', 'cat_2', 'cat_3'];

export const CATEGORIES = [
  { id: 'cat_1', label: 'Categoria 1', coverId: 'img_001', color: '#6366f1' },
  { id: 'cat_2', label: 'Categoria 2', coverId: 'img_029', color: '#ec4899' },
  { id: 'cat_3', label: 'Categoria 3', coverId: 'img_054', color: '#14b8a6' },
];

// ── Dati grezzi (senza categoria — assegnata automaticamente sotto) ──
const _RAW = [
  { id: 'img_001', url: '/vortex/images/img_001.webp', w: 950,  h: 904,  title: 'Immagine 1',  subtitle: '', description: '' },
  { id: 'img_002', url: '/vortex/images/img_002.webp', w: 550,  h: 550,  title: 'Immagine 2',  subtitle: '', description: '' },
  { id: 'img_003', url: '/vortex/images/img_003.webp', w: 584,  h: 843,  title: 'Immagine 3',  subtitle: '', description: '' },
  { id: 'img_004', url: '/vortex/images/img_004.webp', w: 595,  h: 375,  title: 'Immagine 4',  subtitle: '', description: '' },
  { id: 'img_005', url: '/vortex/images/img_005.webp', w: 459,  h: 905,  title: 'Immagine 5',  subtitle: '', description: '' },
  { id: 'img_006', url: '/vortex/images/img_006.webp', w: 459,  h: 905,  title: 'Immagine 6',  subtitle: '', description: '' },
  { id: 'img_007', url: '/vortex/images/img_007.webp', w: 459,  h: 905,  title: 'Immagine 7',  subtitle: '', description: '' },
  { id: 'img_008', url: '/vortex/images/img_008.webp', w: 459,  h: 905,  title: 'Immagine 8',  subtitle: '', description: '' },
  { id: 'img_009', url: '/vortex/images/img_009.webp', w: 653,  h: 470,  title: 'Immagine 9',  subtitle: '', description: '' },
  { id: 'img_010', url: '/vortex/images/img_010.webp', w: 768,  h: 292,  title: 'Immagine 10', subtitle: '', description: '' },
  { id: 'img_011', url: '/vortex/images/img_011.webp', w: 608,  h: 855,  title: 'Immagine 11', subtitle: '', description: '' },
  { id: 'img_012', url: '/vortex/images/img_012.webp', w: 850,  h: 569,  title: 'Immagine 12', subtitle: '', description: '' },
  { id: 'img_013', url: '/vortex/images/img_013.webp', w: 616,  h: 314,  title: 'Immagine 13', subtitle: '', description: '' },
  { id: 'img_014', url: '/vortex/images/img_014.webp', w: 712,  h: 232,  title: 'Immagine 14', subtitle: '', description: '' },
  { id: 'img_015', url: '/vortex/images/img_015.webp', w: 873,  h: 256,  title: 'Immagine 15', subtitle: '', description: '' },
  { id: 'img_016', url: '/vortex/images/img_016.webp', w: 1274, h: 699,  title: 'Immagine 16', subtitle: '', description: '' },
  { id: 'img_017', url: '/vortex/images/img_017.webp', w: 990,  h: 620,  title: 'Immagine 17', subtitle: '', description: '' },
  { id: 'img_018', url: '/vortex/images/img_018.webp', w: 691,  h: 497,  title: 'Immagine 18', subtitle: '', description: '' },
  { id: 'img_019', url: '/vortex/images/img_019.webp', w: 415,  h: 556,  title: 'Immagine 19', subtitle: '', description: '' },
  { id: 'img_020', url: '/vortex/images/img_020.webp', w: 415,  h: 1875, title: 'Immagine 20', subtitle: '', description: '' },
  { id: 'img_021', url: '/vortex/images/img_021.webp', w: 1134, h: 915,  title: 'Immagine 21', subtitle: '', description: '' },
  { id: 'img_022', url: '/vortex/images/img_022.webp', w: 213,  h: 577,  title: 'Immagine 22', subtitle: '', description: '' },
  { id: 'img_023', url: '/vortex/images/img_023.webp', w: 673,  h: 1092, title: 'Immagine 23', subtitle: '', description: '' },
  { id: 'img_024', url: '/vortex/images/img_024.webp', w: 716,  h: 919,  title: 'Immagine 24', subtitle: '', description: '' },
  { id: 'img_025', url: '/vortex/images/img_025.webp', w: 736,  h: 1205, title: 'Immagine 25', subtitle: '', description: '' },
  { id: 'img_026', url: '/vortex/images/img_026.webp', w: 621,  h: 1088, title: 'Immagine 26', subtitle: '', description: '' },
  { id: 'img_027', url: '/vortex/images/img_027.webp', w: 488,  h: 941,  title: 'Immagine 27', subtitle: '', description: '' },
  { id: 'img_028', url: '/vortex/images/img_028.webp', w: 335,  h: 778,  title: 'Immagine 28', subtitle: '', description: '' },
  { id: 'img_029', url: '/vortex/images/img_029.webp', w: 504,  h: 443,  title: 'Immagine 29', subtitle: '', description: '' },
  { id: 'img_030', url: '/vortex/images/img_030.webp', w: 683,  h: 244,  title: 'Immagine 30', subtitle: '', description: '' },
  { id: 'img_031', url: '/vortex/images/img_031.webp', w: 471,  h: 349,  title: 'Immagine 31', subtitle: '', description: '' },
  { id: 'img_032', url: '/vortex/images/img_032.webp', w: 477,  h: 1408, title: 'Immagine 32', subtitle: '', description: '' },
  { id: 'img_033', url: '/vortex/images/img_033.webp', w: 526,  h: 712,  title: 'Immagine 33', subtitle: '', description: '' },
  { id: 'img_034', url: '/vortex/images/img_034.webp', w: 738,  h: 554,  title: 'Immagine 34', subtitle: '', description: '' },
  { id: 'img_035', url: '/vortex/images/img_035.webp', w: 632,  h: 1559, title: 'Immagine 35', subtitle: '', description: '' },
  { id: 'img_036', url: '/vortex/images/img_036.webp', w: 431,  h: 254,  title: 'Immagine 36', subtitle: '', description: '' },
  { id: 'img_037', url: '/vortex/images/img_037.webp', w: 634,  h: 438,  title: 'Immagine 37', subtitle: '', description: '' },
  { id: 'img_038', url: '/vortex/images/img_038.webp', w: 626,  h: 1135, title: 'Immagine 38', subtitle: '', description: '' },
  { id: 'img_039', url: '/vortex/images/img_039.webp', w: 819,  h: 541,  title: 'Immagine 39', subtitle: '', description: '' },
  { id: 'img_040', url: '/vortex/images/img_040.webp', w: 853,  h: 371,  title: 'Immagine 40', subtitle: '', description: '' },
  { id: 'img_041', url: '/vortex/images/img_041.webp', w: 902,  h: 778,  title: 'Immagine 41', subtitle: '', description: '' },
  { id: 'img_042', url: '/vortex/images/img_042.webp', w: 725,  h: 740,  title: 'Immagine 42', subtitle: '', description: '' },
  { id: 'img_043', url: '/vortex/images/img_043.webp', w: 601,  h: 1068, title: 'Immagine 43', subtitle: '', description: '' },
  { id: 'img_044', url: '/vortex/images/img_044.webp', w: 631,  h: 843,  title: 'Immagine 44', subtitle: '', description: '' },
  { id: 'img_045', url: '/vortex/images/img_045.webp', w: 736,  h: 601,  title: 'Immagine 45', subtitle: '', description: '' },
  { id: 'img_046', url: '/vortex/images/img_046.webp', w: 600,  h: 777,  title: 'Immagine 46', subtitle: '', description: '' },
  { id: 'img_047', url: '/vortex/images/img_047.webp', w: 685,  h: 488,  title: 'Immagine 47', subtitle: '', description: '' },
  { id: 'img_048', url: '/vortex/images/img_048.webp', w: 986,  h: 1261, title: 'Immagine 48', subtitle: '', description: '' },
  { id: 'img_049', url: '/vortex/images/img_049.webp', w: 700,  h: 394,  title: 'Immagine 49', subtitle: '', description: '' },
  { id: 'img_050', url: '/vortex/images/img_050.webp', w: 724,  h: 724,  title: 'Immagine 50', subtitle: '', description: '' },
  { id: 'img_051', url: '/vortex/images/img_051.webp', w: 736,  h: 1128, title: 'Immagine 51', subtitle: '', description: '' },
  { id: 'img_052', url: '/vortex/images/img_052.webp', w: 382,  h: 1248, title: 'Immagine 52', subtitle: '', description: '' },
  { id: 'img_053', url: '/vortex/images/img_053.webp', w: 716,  h: 476,  title: 'Immagine 53', subtitle: '', description: '' },
  { id: 'img_054', url: '/vortex/images/img_054.webp', w: 736,  h: 411,  title: 'Immagine 54', subtitle: '', description: '' },
];

// ── Assegnazione categorie (round-robin) ────────────────────────────
export const IMAGES = _RAW.map((img, i) => ({
  ...img,
  category: CATEGORY_IDS[i % 3],
}));
