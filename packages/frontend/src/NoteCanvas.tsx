import React, { useRef, useState } from 'react';
import { StickyNote } from './StickyNote';
import './App.css';
import { Note } from './App';

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
  const pinchRef = useRef<{ start: number; zoom: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const applyZoom = (newZoom: number) => {
    const clamped = Math.max(0.5, Math.min(3, newZoom));
    const board = boardRef.current;
    if (board) {
      const rect = board.getBoundingClientRect();
      const cx = (rect.width / 2 - offset.x) / zoom;
      const cy = (rect.height / 2 - offset.y) / zoom;
      setOffset({ x: rect.width / 2 - cx * clamped, y: rect.height / 2 - cy * clamped });
    }
    setZoom(clamped);
  };

  const pointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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
        pinchRef.current = {
          start: Math.hypot(a.x - b.x, a.y - b.y),
          zoom,
        };
      }
    }
  };

  const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') {
      touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinchRef.current && touchesRef.current.size === 2) {
        const [a, b] = Array.from(touchesRef.current.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const newZoom = pinchRef.current.zoom * (dist / pinchRef.current.start);
        applyZoom(newZoom);
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
    touchesRef.current.delete(e.pointerId);
    if (touchesRef.current.size < 2) {
      pinchRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    applyZoom(zoom * factor);
  };

  return (
    <div
      className={`board${panning ? ' panning' : ''}`}
      ref={boardRef}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onWheel={handleWheel}
    >
      <div
        className="notes"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
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
      <div className="zoom-controls">
        <button onClick={() => applyZoom(zoom * 1.1)} title="Zoom In">
          <i className="fa-solid fa-magnifying-glass-plus" />
        </button>
        <input
          className="zoom-slider"
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={zoom}
          onChange={e => applyZoom(Number(e.target.value))}
        />
        <div className="zoom-percentage">{Math.round(zoom * 100)}%</div>
        <button onClick={() => applyZoom(zoom * 0.9)} title="Zoom Out">
          <i className="fa-solid fa-magnifying-glass-minus" />
        </button>
      </div>
    </div>
  );
};
