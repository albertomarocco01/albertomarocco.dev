"use client";

import { useApp } from "@/components/providers/AppProvider";

/**
 * May the ambient WebGL field exist on this visit? One answer for the four
 * things that ride it — the field itself (FieldMount), the name melt
 * (NameMelt), the /about cut-outs (AboutFigure) and the gen-row auras
 * (WorkRows → Row) — so they can never disagree and mount a <View> onto a
 * canvas that is not there.
 *
 * Three gates. `fieldReady`: past first paint + an idle slot (AppProvider), so
 * the 3D chunk never sits on the LCP path. `reducedMotion`: no shader loop for
 * a visitor who asked for none. And a device where the field cannot be
 * enjoyed: the visitor asked to save data, or the machine has ≤ 2 GB or ≤ 2
 * cores — there the ~430 KB gz of three + fiber + drei and a fullscreen fbm
 * every frame buy a stutter, not an ambience. All three degrade the same
 * way, to the designed static plates: the DOM h1 stays the name, the <img>
 * stays the figure, the gen rows keep their amber plate. Nothing is left
 * missing, only quieter.
 */

/** Below or at these the field is not mounted. Sight-tunable; the audit's
 *  numbers (S1). `deviceMemory` is Chromium-only and rounded to powers of
 *  two (0.25 … 8); Safari and Firefox never report it, and are not gated on
 *  it. */
export const LOW_END = {
  deviceMemoryGb: 2,
  cores: 2,
} as const;

type TieredNavigator = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

let cached: boolean | null = null;

/** A device that cannot enjoy the field (see LOW_END). Read once: none of
 *  these change under a page. Client only — never called during SSR because
 *  `fieldReady` is false there. */
export function lowEndDevice(): boolean {
  if (cached != null) return cached;
  if (typeof navigator === "undefined") return false;
  const n = navigator as TieredNavigator;
  cached =
    n.connection?.saveData === true ||
    (n.deviceMemory ?? Infinity) <= LOW_END.deviceMemoryGb ||
    (n.hardwareConcurrency ?? Infinity) <= LOW_END.cores;
  return cached;
}

/** The one gate every field consumer reads. Order matters: `fieldReady` is
 *  false on the server and while hydrating, so `lowEndDevice()` (a navigator
 *  read) only ever runs on the client, after hydration — no mismatch. */
export function useFieldAllowed(): boolean {
  const { fieldReady, reducedMotion } = useApp();
  return fieldReady && !reducedMotion && !lowEndDevice();
}
