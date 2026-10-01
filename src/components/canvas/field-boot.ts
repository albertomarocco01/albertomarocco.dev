/**
 * Is the shared WebGL field on its way up? A tiny signal between the field and
 * the loading veil, kept out of field-state.ts so the Loader (initial chunk)
 * never pulls the field's GLSL in with it.
 *
 * On a first load the veil is the only moment the field can boot unseen:
 * evaluating three + fiber + drei (~1 MB) and compiling the fullscreen shader
 * are long main-thread tasks, and landing them under the reveal is what made
 * the opening stutter — and on a slow network the field popped in after its
 * own entrance burst. So FieldMount reports `pending` as it starts, Field
 * reports `ready` once a frame has really been drawn, and the Loader parks the
 * bar until then (bounded: see `holdForPage`). Where the field never mounts
 * (reduced motion, a low-end device, a chunk that failed) the status stays or
 * returns to `none`, and nothing waits.
 */
type FieldBoot = "none" | "pending" | "ready";

let status: FieldBoot = "none";
const listeners = new Set<() => void>();

export function setFieldBoot(next: FieldBoot): void {
  if (next === status) return;
  status = next;
  listeners.forEach((l) => l());
}

/** The field is mounting and has not drawn its first frame yet. */
export function fieldBooting(): boolean {
  return status === "pending";
}

/** Called on every status change; returns the unsubscribe. */
export function onFieldBoot(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
