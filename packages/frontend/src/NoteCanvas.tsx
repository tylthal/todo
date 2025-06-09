import React, { useEffect, useRef, useState } from 'react';
import { StickyNote } from './StickyNote';
import './App.css';
import { Note } from './App';
import { clampZoom, zoomAroundCenter, zoomAroundPoint, MIN_ZOOM, MAX_ZOOM } from './zoomUtils';

export interface NoteCanvasProps {
  notes: Note[];
  onUpdate: (id: number, data: Partial<Note>) => void;
  onArchive: (id: number, archived: boolean) => void;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  offset: { x: number; y: number };
  setOffset: (pos: { x: number; y: number }) => void;
  zoom: number;
  setZoom: (z: number) => void;
}

export const NoteCanvas: React.FC<NoteCanvasProps> = ({
  notes,
  onUpdate,
  onArchive,
  selectedId,
  onSelect,
  offset,
  setOffset,
  zoom,
  setZoom
}) => {
  const panRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const touchesRef = useRef(new Map<number, {x: number; y: number}>());
  // Information about an active pinch/gesture zoom
  const pinchRef = useRef<{
    start: number; // initial distance between touches or initial gesture scale
    zoom: number;  // zoom level when the gesture started
    center: { x: number; y: number }; // screen coordinates of the gesture center
  } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(offset);
  const [mousePos, setMousePos] = useState<{x: number; y: number} | null>(null);

  const toBoardCoords = (clientX: number, clientY: number) => {
    const board = boardRef.current;
    if (!board) return { x: 0, y: 0 };
    const rect = board.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offsetRef.current.x) / zoomRef.current,
      y: (clientY - rect.top - offsetRef.current.y) / zoomRef.current,
    };
  };

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  // Keep the internal zoom reference in sync with the active workspace's zoom
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  /**
   * Zoom using the UI controls. The view should stay centered on the screen
   * while zooming, so we adjust the offset accordingly using the utility
   * helpers.
   */
  const applyZoom = (newZoom: number) => {
    const board = boardRef.current;
    if (!board) return;
    const clamped = clampZoom(newZoom);
    setZoom(clamped);
    setOffset(o => zoomAroundCenter(board, zoomRef.current, clamped, o));
    zoomRef.current = clamped;
  };

  const fitToScreen = () => {
    const board = boardRef.current;
    if (!board || notes.length === 0) return;
    const rect = board.getBoundingClientRect();
    const minX = Math.min(...notes.map(n => n.x));
    const minY = Math.min(...notes.map(n => n.y));
    const maxX = Math.max(...notes.map(n => n.x + n.width));
    const maxY = Math.max(...notes.map(n => n.y + n.height));
    const width = maxX - minX || rect.width;
    const height = maxY - minY || rect.height;
    const scale = clampZoom(Math.min(rect.width / width, rect.height / height));
    zoomRef.current = scale;
    setZoom(scale);
    const x = (rect.width - width * scale) / 2 - minX * scale;
    const y = (rect.height - height * scale) / 2 - minY * scale;
    setOffset({ x, y });
  };

  const zoomRef = useRef(zoom);

  const pointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onSelect(null);
    setMousePos(toBoardCoords(e.clientX, e.clientY));
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
    setPanning(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch') {
      touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touchesRef.current.size === 2) {
        const [a, b] = Array.from(touchesRef.current.values());
        const start = Math.hypot(a.x - b.x, a.y - b.y);
        const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        pinchRef.current = { start, zoom: zoomRef.current, center };
      }
    }
  };

  const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    setMousePos(toBoardCoords(e.clientX, e.clientY));
    if (e.pointerType === 'touch') {
      touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinchRef.current && touchesRef.current.size === 2) {
        const board = boardRef.current;
        if (!board) return;
        const [a, b] = Array.from(touchesRef.current.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const newZoom = clampZoom(
          pinchRef.current.zoom * (dist / pinchRef.current.start)
        );
        const pivot = pinchRef.current.center;
        setZoom(newZoom);
        setOffset(
          zoomAroundPoint(board, pivot, pinchRef.current.zoom, newZoom, offsetRef.current)
        );
        zoomRef.current = newZoom;
        return;
      }
    }
    if (!panRef.current || pinchRef.current) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    setOffset({ x: panRef.current.startOffsetX + dx, y: panRef.current.startOffsetY + dy });
  };

  const pointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    panRef.current = null;
    setPanning(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setMousePos(toBoardCoords(e.clientX, e.clientY));
    touchesRef.current.delete(e.pointerId);
    if (touchesRef.current.size < 2) {
      pinchRef.current = null;
    }
  };

  /**
   * Zoom using the mouse wheel or trackpad. The zoom should originate from the
   * cursor position, so we compute a new offset relative to that point.
   */
  const applyWheelZoom = (
    clientX: number,
    clientY: number,
    deltaY: number,
    target: HTMLElement
  ) => {
    const factor = deltaY < 0 ? 1.1 : 0.9;
    const newZoom = clampZoom(zoomRef.current * factor);
    const pivot = { x: clientX, y: clientY };
    setZoom(newZoom);
    setOffset(
      zoomAroundPoint(target, pivot, zoomRef.current, newZoom, offsetRef.current)
    );
    zoomRef.current = newZoom;
  };


  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyWheelZoom(e.clientX, e.clientY, e.deltaY, board);
    };
    board.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      board.removeEventListener('wheel', onWheel);
    };
  }, []);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const gestureStart = (e: any) => {
      e.preventDefault();
      pinchRef.current = {
        start: 1,
        zoom: zoomRef.current,
        center: { x: e.clientX, y: e.clientY },
      };
    };
    const gestureChange = (e: any) => {
      if (!pinchRef.current) return;
      e.preventDefault();
      const newZoom = pinchRef.current.zoom * e.scale;
      const clamped = clampZoom(newZoom);
      const pivot = pinchRef.current.center;
      setZoom(clamped);
      setOffset(
        zoomAroundPoint(board, pivot, pinchRef.current.zoom, clamped, offsetRef.current)
      );
      zoomRef.current = clamped;
    };
    const gestureEnd = () => {
      pinchRef.current = null;
    };
    board.addEventListener('gesturestart', gestureStart as EventListener);
    board.addEventListener('gesturechange', gestureChange as EventListener);
    board.addEventListener('gestureend', gestureEnd as EventListener);
    return () => {
      board.removeEventListener('gesturestart', gestureStart as EventListener);
      board.removeEventListener('gesturechange', gestureChange as EventListener);
      board.removeEventListener('gestureend', gestureEnd as EventListener);
    };
  }, [offset]);

  return (
    <div
      className={`board${panning ? ' panning' : ''}`}
      ref={boardRef}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onPointerLeave={() => setMousePos(null)}
    >
      <div
        className="notes"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          // Expose the current zoom level as a CSS variable so child
          // elements can adjust their styling based on it.
          '--zoom': zoom,
        } as React.CSSProperties}
      >
        {notes.map(note => (
          <StickyNote
            key={note.id}
            note={note}
            onUpdate={onUpdate}
            onArchive={onArchive}
            selected={selectedId === note.id}
            onSelect={onSelect}
            offset={offset}
            zoom={zoom}
          />
        ))}
      </div>
      <div className="zoom-controls" onPointerDown={e => e.stopPropagation()}>
        <button onClick={() => applyZoom(zoomRef.current * 0.9)} title="Zoom Out">
          <i className="fa-solid fa-magnifying-glass-minus" />
        </button>
        <input
          className="zoom-slider"
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step="0.1"
          value={zoom}
          onChange={e => applyZoom(Number(e.target.value))}
        />
        <div className="zoom-percentage">{Math.round(zoom * 100)}%</div>
        <button onClick={fitToScreen} title="Fit to Screen">
          <i className="fa-solid fa-up-right-and-down-left-from-center" />
        </button>
        <button onClick={() => applyZoom(zoomRef.current * 1.1)} title="Zoom In">
          <i className="fa-solid fa-magnifying-glass-plus" />
        </button>
      </div>
      <div className="debug-info">
        {`top-left: ${Math.round(-offset.x / zoom)}, ${Math.round(-offset.y / zoom)} | `}
        {mousePos ? `mouse: ${Math.round(mousePos.x)}, ${Math.round(mousePos.y)}` : 'mouse: -,-'}
      </div>
    </div>
  );
};
