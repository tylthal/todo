import React, { useEffect, useRef, useState } from 'react';
import { StickyNote } from './StickyNote';
import './App.css';
import { Note } from './App';
import { clampZoom, zoomAroundCenter, zoomAroundPoint, MIN_ZOOM, MAX_ZOOM } from './zoomUtils';

// Canvas that renders all sticky notes for the active workspace. Handles panning
// and zooming interactions as well as delegating updates to individual notes.

export interface NoteCanvasProps {
  /** Notes to display */
  notes: Note[];
  /** Update a note's data */
  onUpdate: (id: number, data: Partial<Note>) => void;
  /** Archive/unarchive a note */
  onArchive: (id: number, archived: boolean) => void;
  /** Pin or unpin a note behind all others */
  onSetPinned: (id: number, pinned: boolean) => void;
  /** Id of the currently selected note */
  selectedId: number | null;
  /** Select a note or clear the selection */
  onSelect: (id: number | null) => void;
  /** Current pan offset of the board */
  offset: { x: number; y: number };
  /** Set a new pan offset */
  setOffset: (pos: { x: number; y: number }) => void;
  /** Current zoom level */
  zoom: number;
  /** Set a new zoom level */
  setZoom: (z: number) => void;
}

export const NoteCanvas: React.FC<NoteCanvasProps> = ({
  notes,
  onUpdate,
  onArchive,
  onSetPinned,
  selectedId,
  onSelect,
  offset,
  setOffset,
  zoom,
  setZoom
}) => {
  // Temporary state used while the user is panning the board with a pointer
  const panRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const [panning, setPanning] = useState(false);
  // Track active touch points for pinch gestures
  const touchesRef = useRef(new Map<number, {x: number; y: number}>());
  // Information about an active pinch/gesture zoom
  const pinchRef = useRef<{
    start: number; // initial distance between touches or initial gesture scale
    zoom: number;  // zoom level when the gesture started
    center: { x: number; y: number }; // screen coordinates of the gesture center
    offset: { x: number; y: number }; // pan offset when the gesture started
  } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  // Mirror of the offset prop used inside gesture handlers
  const offsetRef = useRef(offset);
  // Container used to render note controls above all notes
  const overlayRef = useRef<HTMLDivElement>(null);

  // Keep the refs in sync with the props so event handlers always use the
  // latest values.
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
    setOffset(
      zoomAroundCenter(board, zoomRef.current, clamped, offsetRef.current)
    );
    zoomRef.current = clamped;
  };

  const fitToScreen = () => {
    // Calculate a zoom level that fits all notes within the viewport
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
    // Start panning the board
    onSelect(null);
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
        pinchRef.current = {
          start,
          zoom: zoomRef.current,
          center,
          offset: offsetRef.current,
        };
      }
    }
  };

  const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Handle dragging or pinch-zoom gestures
    if (e.pointerType === 'touch') {
      touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinchRef.current && touchesRef.current.size === 2) {
        const board = boardRef.current;
        if (!board) return;
        const [a, b] = Array.from(touchesRef.current.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const newZoom = clampZoom(
          pinchRef.current.zoom * (dist / pinchRef.current.start)
        );
        const baseOffset = zoomAroundPoint(
          board,
          pinchRef.current.center,
          pinchRef.current.zoom,
          newZoom,
          pinchRef.current.offset
        );
        const dx = center.x - pinchRef.current.center.x;
        const dy = center.y - pinchRef.current.center.y;
        const newOffset = { x: baseOffset.x + dx, y: baseOffset.y + dy };
        setZoom(newZoom);
        setOffset(newOffset);
        zoomRef.current = newZoom;
        pinchRef.current = {
          start: dist,
          zoom: newZoom,
          center,
          offset: newOffset,
        };
        return;
      }
    }
    if (!panRef.current || pinchRef.current) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    setOffset({ x: panRef.current.startOffsetX + dx, y: panRef.current.startOffsetY + dy });
  };

  const pointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // End of panning or gesture
    panRef.current = null;
    setPanning(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
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
    // Wheel zoom increments the zoom level while keeping the cursor position
    // stationary relative to the board.
    const factor = deltaY < 0 ? 1.1 : 0.9;
    const newZoom = clampZoom(zoomRef.current * factor);
    const pivot = { x: clientX, y: clientY };
    setZoom(newZoom);
    setOffset(
      zoomAroundPoint(target, pivot, zoomRef.current, newZoom, offsetRef.current)
    );
    zoomRef.current = newZoom;
  };


  // Re-register wheel zoom handler whenever the active workspace changes so the
  // correct setters are used
  useEffect(() => {
    // Support trackpad pinch gestures on Safari by listening to gesture events
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
  }, [setZoom, setOffset]);

  // Gesture events also need to use the latest workspace handlers for pinch zoom
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const gestureStart = (e: any) => {
      e.preventDefault();
      // Start a two-finger pinch gesture
      pinchRef.current = {
        start: e.scale,
        zoom: zoomRef.current,
        center: { x: e.clientX, y: e.clientY },
        offset: offsetRef.current,
      };
    };
    const gestureChange = (e: any) => {
      if (!pinchRef.current) return;
      e.preventDefault();
      // Adjust zoom according to the gesture's scale factor and movement
      const center = { x: e.clientX, y: e.clientY };
      const scaleDelta = e.scale / pinchRef.current.start;
      const newZoom = clampZoom(pinchRef.current.zoom * scaleDelta);
      const baseOffset = zoomAroundPoint(
        board,
        pinchRef.current.center,
        pinchRef.current.zoom,
        newZoom,
        pinchRef.current.offset
      );
      const dx = center.x - pinchRef.current.center.x;
      const dy = center.y - pinchRef.current.center.y;
      const newOffset = { x: baseOffset.x + dx, y: baseOffset.y + dy };
      setZoom(newZoom);
      setOffset(newOffset);
      zoomRef.current = newZoom;
      pinchRef.current = {
        start: e.scale,
        zoom: newZoom,
        center,
        offset: newOffset,
      };
    };
    const gestureEnd = () => {
      // Gesture finished
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
  }, [setZoom, setOffset]);

  return (
    <div
      className={`board${panning ? ' panning' : ''}`}
      ref={boardRef}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
    >
      <div
        className="notes"
        style={{
          // Apply the board pan/zoom via CSS transforms
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
            onSetPinned={onSetPinned}
            selected={selectedId === note.id}
            onSelect={onSelect}
            offset={offset}
            zoom={zoom}
            overlayContainer={overlayRef.current}
          />
        ))}
      </div>
      <div
        ref={overlayRef}
        className="note-overlays"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          '--zoom': zoom,
        } as React.CSSProperties}
      />
      {/* Overlay with buttons and slider to control zoom */}
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
    </div>
  );
};
