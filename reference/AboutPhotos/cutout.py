"""
Cut the person out of the two /about reference photos and emit the web assets.

    python reference/AboutPhotos/cutout.py [--preview DIR] [--only NAME]

Reads Laurea.JPEG and Calisthenics.jpg from this folder, runs rembg
(background removal, ONNX — first run downloads the models: BiRefNet ~970MB,
ISNet ~180MB), trims the result to the silhouette's bounding box (with a
little air around it), scales it to MAX_H tall and writes lossy
WebP-with-alpha into src/assets/about/, which is what both the DOM <img> and
the WebGL figure texture load (see src/components/about/AboutFigure.tsx).
`--preview` also drops full-res PNGs somewhere for eyeballing the matte.

BiRefNet is the matte: clean hair, no halo, no confetti, and it keeps the
shoes on the calisthenics shot. It drops the hands there, though (they are
inside the parallette's bracket), so that one window is taken from ISNet.

Runs on the CPU provider: onnxruntime's CoreML provider stalls on BiRefNet
on Apple silicon (the process sits idle at 0% forever).

Deps (not part of the site): pip install rembg onnxruntime pillow scipy
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from rembg import new_session, remove
from scipy import ndimage

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1] / "src" / "assets" / "about"

# Output height in px. The figure is drawn at most ~85vh tall on a desktop at
# DPR 1.5 (~1400px); 1800 keeps it crisp there while staying a few hundred KB.
MAX_H = 1800
# Working height: the sources are cut at this size (the Nikon frame is 5816
# tall; the models infer at 1024 anyway). The hand-authored windows in
# `clean_calisthenics` are in this space.
WORK_H = 3000
# Air around the silhouette, as a fraction of the bbox height, so the fade at
# the feet and the blur of the orbs have room and nothing is shaved.
PAD = 0.03
WEBP_QUALITY = 84

MODEL = "birefnet-general"
HANDS_MODEL = "isnet-general-use"
PROVIDERS = ["CPUExecutionProvider"]

SOURCES = {
    "laurea": "Laurea.JPEG",
    "calisthenics": "Calisthenics.jpg",
}


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


def largest_component(a: np.ndarray) -> np.ndarray:
    """Keep only the biggest connected blob of the matte — the person. Drops
    stray confetti, the strap ends and any speckle."""
    lab, n = ndimage.label(a > 8, structure=np.ones((3, 3)))
    if n <= 1:
        return a
    areas = ndimage.sum(np.ones_like(a), lab, index=range(1, n + 1))
    keep = int(np.argmax(areas)) + 1
    return np.where(lab == keep, a, 0)


def clean_laurea(rgb: np.ndarray, a: np.ndarray) -> np.ndarray:
    """Confetti on the pavement touch the shoes, so they survive the
    largest-blob pass: drop anything bright and strongly coloured around the
    shoes. The navy hem and the blue glints on the leather are dark, so they
    stay."""
    h = a.shape[0]
    y = np.arange(h)[:, None]
    hue, sat, val = rgb_to_hsv(rgb)
    bbox_bottom = np.nonzero((a > 8).any(1))[0].max()
    shoes = y >= bbox_bottom - 0.09 * h
    return np.where(shoes & (sat > 0.4) & (val > 0.5), 0, a)


def clean_calisthenics(rgb: np.ndarray, a: np.ndarray, hands: np.ndarray) -> np.ndarray:
    """Coordinates are authored on this photo at WORK_H and scale with it, so
    they only hold for Calisthenics.jpg — a one-off asset step, not a tool."""
    h, w = a.shape
    f = h / WORK_H
    x = np.arange(w)[None, :]
    y = np.arange(h)[:, None]
    hue, sat, val = rgb_to_hsv(rgb)
    a = a.astype(np.float32)

    def win(x0, x1, y0, y1):
        return (x >= x0 * f) & (x < x1 * f) & (y >= y0 * f) & (y < y1 * f)

    # 1. The hands, inside the parallette's white bracket: BiRefNet drops
    #    that block, ISNet keeps it (without the post under it — that starts
    #    below this window). Left of the bracket's face only the fingers
    #    belong (not the bolt, the post's edge); the red strap hanging off it
    #    goes wherever it is.
    red = ((hue < 30) | (hue > 320)) & (sat > 0.28)
    grip = win(940, 1045, 1570, 1812)
    a = np.where(grip & ~red, np.maximum(a, hands), a)
    finger = (hue > 4) & (hue < 34) & (sat > 0.35)
    a = np.where(win(900, 955, 1600, 1830) & ~finger, 0, a)
    a = np.where(win(850, 1000, 1690, 2000) & red, 0, a)
    # 2. The plate behind the knee. Skin there, lit or in shadow, is warm and
    #    strongly saturated (hue < 34, sat > .45); the plate is olive-bronze,
    #    duller (hue 40–55, sat < .55). Keep only skin, then open + feather
    #    the colour cut so the calf's edge is smooth.
    skin = (hue > 4) & (hue < 34) & (sat > 0.45)
    knee = win(1040, 1250, 1845, 2095)
    a = np.where(knee & ~skin, 0, a)
    r = max(1, round(3 * f))
    opened = ndimage.binary_opening(a > 8, structure=np.ones((2 * r + 1, 2 * r + 1)))
    a = np.where(knee & ~opened, 0, a)
    a = np.where(knee, ndimage.gaussian_filter(a, sigma=1.2 * f), a)
    # 3. The dip bar the toes rest against: a lit strip past the right toe.
    a = np.where(win(1325, 99999, 2280, 2400), 0, a)
    a = np.where(win(1292, 1325, 2280, 2357), 0, a)
    return np.clip(a, 0, 255)


def cutout(src: Path, sessions, *, preview: Path | None, name: str) -> Path:
    # Honour the EXIF orientation before anything else (the iPhone shot is
    # stored rotated); rembg works on the pixels it is handed.
    img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    print(f"{name}: source {img.size[0]}x{img.size[1]}", file=sys.stderr)
    if img.height > WORK_H:
        img = img.resize((round(img.width * WORK_H / img.height), WORK_H), Image.LANCZOS)

    def matte(model: str) -> np.ndarray:
        out = remove(img, session=sessions[model], post_process_mask=False)
        return np.array(out.convert("RGBA"))[..., 3].astype(np.float32)

    rgb = np.array(img)
    a = matte(MODEL)
    hsv_in = rgb.astype(np.float32) / 255
    if name == "calisthenics":
        a = clean_calisthenics(hsv_in, a, matte(HANDS_MODEL))
    elif name == "laurea":
        a = clean_laurea(hsv_in, a)
    a = largest_component(a)

    # The colour comes from the source itself, never from rembg's output
    # (which blacks out whatever its own matte dropped — the hands window).
    out = Image.fromarray(np.dstack([rgb, np.clip(a, 0, 255).astype(np.uint8)]))
    bbox = out.getchannel("A").getbbox()
    if not bbox:
        raise SystemExit(f"{name}: no foreground found")
    l, t, r, b = bbox
    pad = int((b - t) * PAD)
    out = out.crop((max(0, l - pad), max(0, t - pad), min(out.width, r + pad), min(out.height, b + pad)))
    print(f"{name}: bbox {out.size[0]}x{out.size[1]}", file=sys.stderr)

    if out.height > MAX_H:
        out = out.resize((round(out.width * MAX_H / out.height), MAX_H), Image.LANCZOS)

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
    ap.add_argument("--preview", type=Path, default=None)
    ap.add_argument("--only", choices=list(SOURCES), default=None)
    args = ap.parse_args()

    names = [n for n in SOURCES if not args.only or n == args.only]
    models = {MODEL} | ({HANDS_MODEL} if "calisthenics" in names else set())
    sessions = {m: new_session(m, providers=PROVIDERS) for m in models}
    for name in names:
        cutout(HERE / SOURCES[name], sessions, preview=args.preview, name=name)


if __name__ == "__main__":
    main()
