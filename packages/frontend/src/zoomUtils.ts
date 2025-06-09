export interface Point {
  x: number;
  y: number;
}

/**
 * Clamp the zoom level between a minimum and maximum value.
 */
export const clampZoom = (z: number, min = 0.5, max = 3): number => {
  return Math.max(min, Math.min(max, z));
};

/**
 * Calculate the new offset when zooming around a specific screen point.
 * `pivot` should be the coordinates in screen space (e.g. mouse position).
 */
export const zoomAroundPoint = (
  board: HTMLElement,
  pivot: Point,
  prevZoom: number,
  nextZoom: number,
  offset: Point
): Point => {
  const rect = board.getBoundingClientRect();
  // Convert the pivot from screen space to board space using the previous zoom.
  const boardX = (pivot.x - rect.left - offset.x) / prevZoom;
  const boardY = (pivot.y - rect.top - offset.y) / prevZoom;

  return {
    x: pivot.x - rect.left - boardX * nextZoom,
    y: pivot.y - rect.top - boardY * nextZoom,
  };
};

/**
 * Calculate the offset when zooming relative to the center of the board.
 */
export const zoomAroundCenter = (
  board: HTMLElement,
  prevZoom: number,
  nextZoom: number,
  offset: Point
): Point => {
  const rect = board.getBoundingClientRect();
  const dx = (rect.width / 2) * (1 / nextZoom - 1 / prevZoom);
  const dy = (rect.height / 2) * (1 / nextZoom - 1 / prevZoom);
  return { x: offset.x + dx, y: offset.y + dy };
};
