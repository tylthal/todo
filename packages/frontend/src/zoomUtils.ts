export interface Point {
  x: number;
  y: number;
}

/** Minimum allowable zoom level */
export const MIN_ZOOM = 0.1;

/** Maximum allowable zoom level */
export const MAX_ZOOM = 3;

/**
 * Clamp the zoom level between a minimum and maximum value.
 */
export const clampZoom = (z: number, min = MIN_ZOOM, max = MAX_ZOOM): number => {
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
  const pivot = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  return zoomAroundPoint(board, pivot, prevZoom, nextZoom, offset);
};
