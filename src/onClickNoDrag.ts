/**
 * Call `onClick` for a primary-button press and release that did not move (a click, not a pan).
 * Uses pointer events, so it works for mouse and single-finger touch. Multi-touch (pinch) is ignored.
 * Started from https://stackoverflow.com/a/59957974/11594175
 *
 * Returns a function that removes the listeners.
 */
export function addClickNoDragListeners(el: HTMLElement, onClick: (event: PointerEvent) => void, maxMovePx = 4) {
  let down: { id: number; x: number; y: number } | null = null;

  function onDown(e: PointerEvent) {
    // a second finger is not primary, so it cancels the click
    down = e.isPrimary && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null;
  }

  function onMove(e: PointerEvent) {
    if (down && e.pointerId === down.id && Math.hypot(e.clientX - down.x, e.clientY - down.y) > maxMovePx) {
      down = null;
    }
  }

  function onUp(e: PointerEvent) {
    if (down && e.pointerId === down.id) {
      down = null;
      onClick(e);
    }
  }

  function onCancel() {
    down = null;
  }

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onCancel);

  return function removeClickNoDragListeners() {
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onCancel);
  };
}
