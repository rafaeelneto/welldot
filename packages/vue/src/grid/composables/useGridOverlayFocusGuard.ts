// RevoGrid clears the active cell's editor on any document-level
// mouseup/touchend that wasn't already preventDefault()'d (see revo-grid's
// mouseupHandle, which checks event.defaultPrevented before clearing focus).
// PrimeVue overlays rendered with append-to="body" live outside the grid's
// DOM tree, so interacting with them (filter input, footer controls) bubbles
// up unprevented and is mistaken for a click outside the grid. Spreading
// these handlers onto the overlay's pt props keeps it open; preventDefault
// (unlike stopPropagation) doesn't block the target's own click handling.
export function useGridOverlayFocusGuard() {
  const preventDefault = (event: Event) => event.preventDefault();

  return {
    onMouseup: preventDefault,
    onTouchend: preventDefault,
  };
}
