/**
 * The zoom toolbar from the reference demo: in, out, fit.
 *
 * Dumb by design — three buttons calling three callbacks. All zoom state lives
 * in useZoom; all fit maths lives in TreeView.
 */
export default function ZoomControls({ onZoomIn, onZoomOut, onFit }) {

  return (
    <div className="tree-view__controls" role="toolbar" aria-label="Zoom controls">

      <button
        type="button"
        className="tree-view__control-button"
        onClick={onZoomOut}
        aria-label="Zoom out"
        title="Zoom out"
      >
        −
      </button>

      <button
        type="button"
        className="tree-view__control-button"
        onClick={onZoomIn}
        aria-label="Zoom in"
        title="Zoom in"
      >
        +
      </button>

      <button
        type="button"
        className="tree-view__control-button"
        onClick={onFit}
        aria-label="Fit to view"
        title="Fit to view"
      >
        ⤢
      </button>

    </div>
  );
}