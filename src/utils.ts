export function checkPointContainedByDiv(point: { x: number; y: number }, divRect: DOMRect | null = null): boolean {
  if (divRect) {
    return (
      point.x >= divRect.left &&
      point.x <= divRect.right &&
      point.y >= divRect.top &&
      point.y <= divRect.bottom
    );
  }
  return point.x >= 0 && point.x <= window.innerWidth && point.y >= 0 && point.y <= window.innerHeight;
}