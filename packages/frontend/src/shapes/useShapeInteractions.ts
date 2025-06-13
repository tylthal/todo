import type { Shape } from '@sticky-notes/shared';

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
  for (const c of candidates) {
    if (Math.abs(value - c) <= threshold) return c;
  }
  return value;
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
      const others = allShapes.filter(n => n.id !== shape.id);
      const xEdges = others.flatMap(n => [n.x, n.x + n.width]);
      const yEdges = others.flatMap(n => [n.y, n.y + n.height]);
      const snappedLeft = snap(newX, xEdges, threshold);
      const snappedRight = snap(newX + shape.width, xEdges, threshold);
      if (Math.abs(snappedRight - (newX + shape.width)) < Math.abs(snappedLeft - newX)) {
        if (snappedRight !== newX + shape.width) lineX = snappedRight;
        newX += snappedRight - (newX + shape.width);
      } else if (snappedLeft !== newX) {
        lineX = snappedLeft;
        newX = snappedLeft;
      }
      const snappedTop = snap(newY, yEdges, threshold);
      const snappedBottom = snap(newY + shape.height, yEdges, threshold);
      if (Math.abs(snappedBottom - (newY + shape.height)) < Math.abs(snappedTop - newY)) {
        if (snappedBottom !== newY + shape.height) lineY = snappedBottom;
        newY += snappedBottom - (newY + shape.height);
      } else if (snappedTop !== newY) {
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
      const others = allShapes.filter(n => n.id !== shape.id);
      const xEdges = others.flatMap(n => [n.x, n.x + n.width]);
      const yEdges = others.flatMap(n => [n.y, n.y + n.height]);
      const snappedLeft = snap(newX, xEdges, threshold);
      const snappedRight = snap(newX + newWidth, xEdges, threshold);
      if (snappedLeft !== newX) {
        const shift = newX - snappedLeft;
        lineX = snappedLeft;
        newX = snappedLeft;
        newWidth = Math.max(80, newWidth + shift);
      }
      if (snappedRight !== newX + newWidth) {
        lineX = snappedRight;
        newWidth = Math.max(80, snappedRight - newX);
      }
      const snappedTop = snap(newY, yEdges, threshold);
      const snappedBottom = snap(newY + newHeight, yEdges, threshold);
      if (snappedTop !== newY) {
        const shift = newY - snappedTop;
        lineY = snappedTop;
        newY = snappedTop;
        newHeight = Math.max(60, newHeight + shift);
      }
      if (snappedBottom !== newY + newHeight) {
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

