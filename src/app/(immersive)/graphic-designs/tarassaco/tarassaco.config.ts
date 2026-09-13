/**
 * Tarassaco — layout tunables (the wind and microphone constants live at the
 * top of hooks/useWindPhysics.ts, where the loop that reads them is).
 *
 * The stage is `position: fixed; inset: 0; overflow: hidden` (nothing ever
 * scrolls), so poem and flower have to share one viewport: under
 * PHONE_MAX_WIDTH the dandelion shrinks and the poem's exclusion zone follows
 * it, and the poem itself is set smaller by the stylesheet (see the
 * `max-width: 640px` block in tarassaco.css — keep the two breakpoints equal).
 */

/** Viewport width (px) at and below which the phone layout applies. */
export const PHONE_MAX_WIDTH = 640;

/** The glowing dandelion's box, in CSS px (square). */
export const FLOWER_SIZE_DESKTOP = 450;
export const FLOWER_SIZE_PHONE = 200;

/**
 * How far the flower box is pulled up and out past the poem's top-right
 * corner (CSS px). Desktop keeps the original -6rem / -3rem; on a phone the
 * small flower hangs 24 px out so its seeds (radius ≈ 65 px around the box
 * centre) start ~50 px right of the widest poem row.
 */
export const FLOWER_OFFSET_DESKTOP = { top: -96, right: -48 };
export const FLOWER_OFFSET_PHONE = { top: -40, right: -24 };

/** Gap the poem keeps from the flower box on its left edge (px). */
export const EXCLUSION_PAD = 30;

/**
 * Rows the "blow" hint under the flower takes: its gap (1rem) plus the mono
 * line and a little air. Added to the exclusion height so the first full-width
 * poem row starts under the hint, not through it.
 */
export const HINT_CLEARANCE = 48;

/**
 * The narrowest the poem may be squeezed beside the flower before the rows
 * give up on the exclusion and run under the box. On a 350 px column the
 * phone value leaves the seeds ~50 px clear of the text.
 */
export const MIN_TEXT_WIDTH_DESKTOP = 200;
export const MIN_TEXT_WIDTH_PHONE = 176;

/** Pick the layout numbers for a viewport width. */
export function flowerLayout(windowWidth: number) {
  const phone = windowWidth <= PHONE_MAX_WIDTH;
  const size = phone ? FLOWER_SIZE_PHONE : FLOWER_SIZE_DESKTOP;
  const offset = phone ? FLOWER_OFFSET_PHONE : FLOWER_OFFSET_DESKTOP;
  return {
    phone,
    size,
    offset,
    // The text must clear the part of the box that overlaps the column: the
    // box minus what hangs outside on the right, plus the gap.
    exclusionWidth: size + offset.right + EXCLUSION_PAD,
    // And the rows the box covers: its height minus what hangs above the top,
    // plus the hint under it.
    exclusionHeight: size + offset.top + HINT_CLEARANCE,
    minTextWidth: phone ? MIN_TEXT_WIDTH_PHONE : MIN_TEXT_WIDTH_DESKTOP,
  };
}
