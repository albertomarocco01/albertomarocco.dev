"""
Cut the person out of the two /about reference photos and emit the web assets.

    python reference/AboutPhotos/cutout.py [--model isnet-general-use] [--preview DIR]

Reads  Laurea.JPEG and Calisthenics.jpg from this folder, runs rembg
(background removal, ONNX — first run downloads the model, ~170MB), trims the
result to the silhouette's bounding box (with a little air around it), scales
it to MAX_H tall and writes lossy WebP-with-alpha into src/assets/about/, which
is what both the DOM <img> and the WebGL figure texture load (see
src/components/about/AboutFigure.tsx). `--preview` also drops full-res PNGs
somewhere for eyeballing the matte.

Deps (not part of the site): pip install rembg onnxruntime pillow
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1] / "src" / "assets" / "about"

# Output height in px. The figure is drawn at most ~85vh tall on a desktop at
# DPR 1.5 (~1400px); 1800 keeps it crisp there while staying a few hundred KB.
MAX_H = 1800
# Air around the silhouette, as a fraction of the bbox height, so the fade at
# the feet and the blur of the orbs have room and nothing is shaved.
PAD = 0.03
WEBP_QUALITY = 82

SOURCES = {
    "laurea": "Laurea.JPEG",
    "calisthenics": "Calisthenics.jpg",
}


def largest_component(rgba: np.ndarray) -> np.ndarray:
    """Keep only the biggest connected blob of the matte — the person. Drops
    the stray fence post the model kept beside the graduation shot and any
    speckle."""
    a = rgba[..., 3]
    lab, n = ndimage.label(a > 8, structure=np.ones((3, 3)))
    if n <= 1:
        return rgba
    areas = ndimage.sum(np.ones_like(a), lab, index=range(1, n + 1))
    keep = int(np.argmax(areas)) + 1
    rgba = rgba.copy()
    rgba[..., 3] = np.where(lab == keep, a, 0)
    return rgba


def rgb_to_hsv(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    v = rgb.max(-1)
    c = v - rgb.min(-1)
    s = np.where(v > 0, c / np.maximum(v, 1e-6), 0)
    h = np.zeros_like(v)
    m = c > 0
    hr = ((g - b) / np.maximum(c, 1e-6)) % 6
    hg = (b - r) / np.maximum(c, 1e-6) + 2
    hb = (r - g) / np.maximum(c, 1e-6) + 4
    h = np.where(m & (v == r), hr, h)
    h = np.where(m & (v == g) & (v != r), hg, h)
    h = np.where(m & (v == b) & (v != r) & (v != g), hb, h)
    return h * 60, s, v


def clean_calisthenics(rgba: np.ndarray) -> np.ndarray:
    """The general model keeps the rig the parallettes bolt to (the black post
    under the white bracket, the red strap) and the plate behind the knee. Erase
    them by hand: geometry for the post/strap, colour for the plate (dark olive
    against sunlit skin). Coordinates were authored on the first-pass 730×1800
    preview of this exact photo and scale with the crop, so they only hold for
    Calisthenics.jpg — this is a one-off asset step, not a general tool."""
    h, w = rgba.shape[:2]
    fx, fy = w / 730, h / 1800
    x = np.arange(w)[None, :]
    y = np.arange(h)[:, None]
    rgba = rgba.copy()
    a = rgba[..., 3]
    # 1. the post under the bracket (and the strap loop on it), plus the strip
    #    of post showing beside the bracket's left edge
    a[(y >= 792 * fy) & (x < 477 * fx)] = 0
    a[(y >= 695 * fy) & (y < 792 * fy) & (x < 390 * fx)] = 0
    # 2. what is left of the red strap beside the bracket. Nothing else in that
    #    window is saturated — the bracket is grey, the post black — so any
    #    warm, saturated pixel there is strap (shadowed maroon included).
    hue, sat, val = rgb_to_hsv(rgba[..., :3].astype(np.float32) / 255)
    red = ((hue < 30) | (hue > 320)) & (sat > 0.28)
    a[red & (y >= 690 * fy) & (y < 900 * fy) & (x < 480 * fx)] = 0
    # 3. the plate behind the knee, to the right of the thigh's lit rim. Keep
    #    only lit, warm skin there: everything else (the plate's dark olive
    #    body, its lit rim, the mixed fringe) goes.
    skin = (hue > 6) & (hue < 36) & (sat > 0.3) & (val > 0.3)
    knee = (y >= 790 * fy) & (y < 990 * fy) & (x >= 548 * fx) & (x < 690 * fx)
    a[~skin & knee] = 0
    # The colour cut leaves a ragged edge and a few specks along the knee:
    # open the matte there (drops the specks, smooths the cut) and feather it.
    r = max(1, round(2 * fy))
    opened = ndimage.binary_opening(a > 8, structure=np.ones((2 * r + 1, 2 * r + 1)))
    a = np.where(knee & ~opened, 0, a).astype(np.float32)
    soft = ndimage.gaussian_filter(a, sigma=1.2 * fy)
    a = np.where(knee, soft, a)
    # Small enclosed holes the colour test punched in the skin (a mole, a
    # shadow) get filled; anything large is real negative space and stays.
    solid = a > 8
    filled = ndimage.binary_fill_holes(solid)
    holes, n = ndimage.label(filled & ~solid)
    if n:
        sizes = ndimage.sum(np.ones_like(a), holes, index=range(1, n + 1))
        small = np.isin(holes, [i + 1 for i, s in enumerate(sizes) if s < 900 * fx * fy])
        a = np.where(small, 255, a)
    rgba[..., 3] = np.clip(a, 0, 255).astype(np.uint8)
    return rgba


def cutout(src: Path, session, *, preview: Path | None, name: str) -> Path:
    img = Image.open(src)
    # Honour the EXIF orientation before anything else (the iPhone shot is
    # stored rotated); rembg works on the pixels it is handed.
    from PIL import ImageOps

    img = ImageOps.exif_transpose(img).convert("RGB")
    print(f"{name}: source {img.size[0]}x{img.size[1]}", file=sys.stderr)

    out = remove(
        img,
        session=session,
        # Trimap-based matting refines hair/leaf edges but needs pymatting and
        # is slow at this size; the plain matte is clean enough on these.
        alpha_matting=False,
        post_process_mask=True,
    ).convert("RGBA")

    def crop_to_matte(img: Image.Image) -> Image.Image:
        bbox = img.getchannel("A").getbbox()
        if not bbox:
            raise SystemExit(f"{name}: no foreground found")
        l, t, r, b = bbox
        pad = int((b - t) * PAD)
        l, t = max(0, l - pad), max(0, t - pad)
        r, b = min(img.width, r + pad), min(img.height, b + pad)
        return img.crop((l, t, r, b))

    out = crop_to_matte(out)
    print(f"{name}: raw bbox {out.size[0]}x{out.size[1]}", file=sys.stderr)

    # Clean the matte at full resolution, then crop again to what survived.
    arr = np.array(out)
    if name == "calisthenics":
        arr = clean_calisthenics(arr)
    arr = largest_component(arr)
    out = crop_to_matte(Image.fromarray(arr, "RGBA"))
    print(f"{name}: clean bbox {out.size[0]}x{out.size[1]}", file=sys.stderr)

    if out.height > MAX_H:
        w = round(out.width * MAX_H / out.height)
        out = out.resize((w, MAX_H), Image.LANCZOS)

    OUT.mkdir(parents=True, exist_ok=True)
    dst = OUT / f"{name}.webp"
    out.save(dst, "WEBP", quality=WEBP_QUALITY, method=6, exact=False)
    print(
        f"{name}: wrote {dst.relative_to(HERE.parents[1])} "
        f"{out.size[0]}x{out.size[1]} ({dst.stat().st_size // 1024} KB)",
        file=sys.stderr,
    )

    if preview:
        preview.mkdir(parents=True, exist_ok=True)
        out.save(preview / f"{name}.png", "PNG")
        # Also a copy over a mid grey so the matte edge is legible.
        bg = Image.new("RGBA", out.size, (40, 40, 44, 255))
        bg.alpha_composite(out)
        bg.convert("RGB").save(preview / f"{name}-on-grey.jpg", quality=88)
    return dst


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="isnet-general-use")
    ap.add_argument("--preview", type=Path, default=None)
    ap.add_argument("--only", choices=list(SOURCES), default=None)
    args = ap.parse_args()

    session = new_session(args.model)
    for name, file in SOURCES.items():
        if args.only and name != args.only:
            continue
        cutout(HERE / file, session, preview=args.preview, name=name)


if __name__ == "__main__":
    main()
