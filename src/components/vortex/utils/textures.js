import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { IMAGES } from '../data/images.js';

// Every texture a VortexCard receives from useLoader is remembered here, so the
// experience can free them on unmount: dispose() drops the GPU copy, and
// useLoader.clear() drops the cache entry that kept the decoded <img> and the
// Texture object alive for the rest of the session (~60–80 MB after one visit,
// audit S2). A revisit simply loads again — the veil covers it.
const live = new Set();

export function trackTexture(texture) {
  live.add(texture);
}

export function releaseTextures() {
  for (const t of live) t.dispose();
  live.clear();
  useLoader.clear(THREE.TextureLoader, IMAGES.map((i) => i.url));
}
