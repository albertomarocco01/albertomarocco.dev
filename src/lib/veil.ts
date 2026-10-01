/**
 * Has the loading veil already played in this *page load*? Module-scoped,
 * deliberately not sessionStorage: the module is re-evaluated on every load, so
 * a refresh always pays the full deliberate opening, while a client-side
 * navigation that remounts the (site) layout (returning from an immersive
 * route) keeps the flag and gets the fast dissolve instead of re-paying the
 * beat. Set by the Loader inside its reveal(), i.e. only once the veil has
 * actually run — StrictMode's mount → cleanup → remount kills the first
 * timeline long before it gets there, so dev still sees the real thing.
 *
 * Its own module, not the Loader's, because the providers read it too
 * (AppProvider mounts the field early when the full veil is about to cover
 * it) and the Loader already imports from them.
 */
let veilPlayed = false;

/**
 * Has the veil already run in this page load? For chrome that pays its own
 * opening beat once per load and not on every remount (Shell's topbar
 * entrance), and for the field's early mount (AppProvider).
 */
export function hasVeilPlayed(): boolean {
  return veilPlayed;
}

export function markVeilPlayed(): void {
  veilPlayed = true;
}
