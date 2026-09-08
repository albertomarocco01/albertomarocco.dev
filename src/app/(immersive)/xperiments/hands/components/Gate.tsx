import type { HandsCopy } from "../copy";

/**
 * The gate: a veil over the drifting prints with the title cover, the camera
 * button (getUserMedia runs inside this click, see useHandTracker), the pointer
 * alternative and the privacy line. The pointer path stays live while the
 * camera initialises, so an ignored permission prompt never strands anyone.
 */
export function Gate({
  copy,
  starting,
  onCamera,
  onPointer,
}: {
  copy: HandsCopy;
  starting: boolean;
  onCamera: () => void;
  onPointer: () => void;
}) {
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
          <span>{starting ? copy.initializing : copy.enable}</span>
        </button>
        <button type="button" className="hands-gate-alt" onClick={onPointer}>
          {copy.pointerMode}
        </button>
      </div>
      <p className="hands-privacy">{copy.privacy}</p>
    </div>
  );
}
