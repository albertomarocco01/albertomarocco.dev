import type { HandsCopy } from "../copy";

/**
 * The gate: a veil over the drifting prints with the title cover, the camera
 * button (getUserMedia runs inside this click, see useHandTracker), the pointer
 * alternative and the privacy line. The pointer path stays live while the
 * camera initialises, so an ignored permission prompt never strands anyone.
 * While the model is still downloading after the click, the button counts it.
 */
export function Gate({
  copy,
  starting,
  progress,
  onCamera,
  onPointer,
}: {
  copy: HandsCopy;
  starting: boolean;
  /** model download, whole percent — null when done or unknown */
  progress: number | null;
  onCamera: () => void;
  onPointer: () => void;
}) {
  const busyLabel = progress !== null ? copy.downloading.replace("{pct}", String(progress)) : copy.initializing;
  return (
    <div className="hands-gate">
      <div className="hands-title" aria-hidden="true">
        <span className="hands-title-main">Mani</span>
        <span className="hands-title-sub">hands</span>
      </div>
      <div className="hands-gate-actions">
        <button
          type="button"
          className={`hands-gate-btn${starting ? " is-busy" : ""}`}
          onClick={onCamera}
          disabled={starting}
          aria-busy={starting}
        >
          <span className="hands-gate-dot" aria-hidden="true" />
          <span>{starting ? busyLabel : copy.enable}</span>
        </button>
        <button type="button" className="hands-gate-alt" onClick={onPointer}>
          {copy.pointerMode}
        </button>
      </div>
      <p className="hands-privacy">{copy.privacy}</p>
    </div>
  );
}
