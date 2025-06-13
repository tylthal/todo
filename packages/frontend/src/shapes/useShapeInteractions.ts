import type { Shape } from '@sticky-notes/shared';
import { getShapeBounds } from '@sticky-notes/shared';

export type SnapLines = { x: number | null; y: number | null };

export interface ShapeInteractionOptions<T extends Shape> {
  shape: T;
  allShapes: T[];
  zoom: number;
  offset: { x: number; y: number };
  snapToEdges: boolean;
  onUpdate: (id: number, data: Partial<T>) => void;
  onSnapLinesChange?: (lines: SnapLines) => void;
}

const SNAP_THRESHOLD = 10;

function snap(value: number, candidates: number[], threshold: number) {
  let closest = value;
  let minDist = threshold + 1;
  for (const c of candidates) {
    const dist = Math.abs(value - c);
    if (dist <= threshold && dist < minDist) {
      minDist = dist;
      closest = c;
    }
  }
  return closest;
}

/**
 * Helper class implementing drag and resize interactions for shapes.
 * It mirrors the logic previously embedded in the StickyNote component.
 */
export class ShapeInteractions<T extends Shape> {
  private mode: 'drag' | 'resize' | null = null;
  private dragOffset = { x: 0, y: 0 };
  private resizeStart = { x: 0, y: 0, width: 0, height: 0 };

  constructor(private opts: ShapeInteractionOptions<T>) {}

  /** Update the option values without resetting interaction state */
  updateOptions(opts: ShapeInteractionOptions<T>) {
    this.opts = { ...this.opts, ...opts };
  }

  private toBoard(clientX: number, clientY: number) {
    const { zoom, offset } = this.opts;
    return { x: (clientX - offset.x) / zoom, y: (clientY - offset.y) / zoom };
  }

  pointerDown(e: PointerEvent) {
    if (this.opts.shape.locked) return;
    const target = e.target as HTMLElement;
    const pos = this.toBoard(e.clientX, e.clientY);
    if (target.closest('.resize-handle')) {
      this.mode = 'resize';
      this.resizeStart = {
        x: pos.x,
        y: pos.y,
        width: this.opts.shape.width,
        height: this.opts.shape.height,
      };
    } else {
      this.mode = 'drag';
      this.dragOffset = { x: pos.x - this.opts.shape.x, y: pos.y - this.opts.shape.y };
    }
  }

  pointerMove(e: PointerEvent) {
    if (!this.mode || this.opts.shape.locked) return;
    const pos = this.toBoard(e.clientX, e.clientY);
    if (this.mode === 'drag') {
      this.handleDrag(pos);
    } else if (this.mode === 'resize') {
      this.handleResize(pos);
    }
  }

  private handleDrag(pos: { x: number; y: number }) {
    const { shape, allShapes, zoom, snapToEdges, onUpdate, onSnapLinesChange } = this.opts;
    let newX = pos.x - this.dragOffset.x;
    let newY = pos.y - this.dragOffset.y;
    let lineX: number | null = null;
    let lineY: number | null = null;
    if (snapToEdges) {
      const threshold = SNAP_THRESHOLD / zoom;
      const others = allShapes
        .filter(n => n.id !== shape.id)
        .map(getShapeBounds);
      const xEdges = others.flatMap(b => [b.left, b.right]);
      const yEdges = others.flatMap(b => [b.top, b.bottom]);
      const snappedLeft = snap(newX, xEdges, threshold);
      const snappedRight = snap(newX + shape.width, xEdges, threshold);
      const dLeft = snappedLeft !== newX ? Math.abs(snappedLeft - newX) : Infinity;
      const dRight =
        snappedRight !== newX + shape.width
          ? Math.abs(snappedRight - (newX + shape.width))
          : Infinity;
      if (dRight < dLeft) {
        lineX = snappedRight;
        newX += snappedRight - (newX + shape.width);
      } else if (dLeft !== Infinity) {
        lineX = snappedLeft;
        newX = snappedLeft;
      }
      const snappedTop = snap(newY, yEdges, threshold);
      const snappedBottom = snap(newY + shape.height, yEdges, threshold);
      const dTop = snappedTop !== newY ? Math.abs(snappedTop - newY) : Infinity;
      const dBottom =
        snappedBottom !== newY + shape.height
          ? Math.abs(snappedBottom - (newY + shape.height))
          : Infinity;
      if (dBottom < dTop) {
        lineY = snappedBottom;
        newY += snappedBottom - (newY + shape.height);
      } else if (dTop !== Infinity) {
        lineY = snappedTop;
        newY = snappedTop;
      }
    }
    onUpdate(shape.id, { x: newX, y: newY });
    onSnapLinesChange?.(snapToEdges ? { x: lineX, y: lineY } : { x: null, y: null });
  }

  private handleResize(pos: { x: number; y: number }) {
    const { shape, allShapes, zoom, snapToEdges, onUpdate, onSnapLinesChange } = this.opts;
    const dx = pos.x - this.resizeStart.x;
    const dy = pos.y - this.resizeStart.y;
    let newX = shape.x;
    let newY = shape.y;
    let newWidth = Math.max(80, this.resizeStart.width + dx);
    let newHeight = Math.max(60, this.resizeStart.height + dy);
    let lineX: number | null = null;
    let lineY: number | null = null;
    if (snapToEdges) {
      const threshold = SNAP_THRESHOLD / zoom;
      const others = allShapes
        .filter(n => n.id !== shape.id)
        .map(getShapeBounds);
      const xEdges = others.flatMap(b => [b.left, b.right]);
      const yEdges = others.flatMap(b => [b.top, b.bottom]);
      const snappedLeft = snap(newX, xEdges, threshold);
      const snappedRight = snap(newX + newWidth, xEdges, threshold);
      const dLeft = snappedLeft !== newX ? Math.abs(snappedLeft - newX) : Infinity;
      const dRight =
        snappedRight !== newX + newWidth
          ? Math.abs(snappedRight - (newX + newWidth))
          : Infinity;
      if (dLeft < dRight && dLeft !== Infinity) {
        const shift = newX - snappedLeft;
        lineX = snappedLeft;
        newX = snappedLeft;
        newWidth = Math.max(80, newWidth + shift);
      } else if (dRight !== Infinity) {
        lineX = snappedRight;
        newWidth = Math.max(80, snappedRight - newX);
      }
      const snappedTop = snap(newY, yEdges, threshold);
      const snappedBottom = snap(newY + newHeight, yEdges, threshold);
      const dTop = snappedTop !== newY ? Math.abs(snappedTop - newY) : Infinity;
      const dBottom =
        snappedBottom !== newY + newHeight
          ? Math.abs(snappedBottom - (newY + newHeight))
          : Infinity;
      if (dTop < dBottom && dTop !== Infinity) {
        const shift = newY - snappedTop;
        lineY = snappedTop;
        newY = snappedTop;
        newHeight = Math.max(60, newHeight + shift);
      } else if (dBottom !== Infinity) {
        lineY = snappedBottom;
        newHeight = Math.max(60, snappedBottom - newY);
      }
    }
    onUpdate(shape.id, { x: newX, y: newY, width: newWidth, height: newHeight });
    onSnapLinesChange?.(snapToEdges ? { x: lineX, y: lineY } : { x: null, y: null });
  }

  pointerUp() {
    this.mode = null;
    this.opts.onSnapLinesChange?.({ x: null, y: null });
  }

  pointerCancel() {
    this.mode = null;
    this.opts.onSnapLinesChange?.({ x: null, y: null });
  }
}

