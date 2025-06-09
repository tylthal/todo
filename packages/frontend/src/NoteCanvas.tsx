import React, { useEffect, useRef, useState } from 'react';
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

  const clampZoom = (z: number) => Math.max(0.5, Math.min(3, z));

  const applyZoom = (newZoom: number) => {
    const clamped = clampZoom(newZoom);
    setZoom(clamped);
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

  useEffect(() => {
    const prev = zoomRef.current;
    if (prev === zoom) return;
    const board = boardRef.current;
    if (board) {
      const rect = board.getBoundingClientRect();
      const dx = rect.width / 2 * (1 / zoom - 1 / prev);
      const dy = rect.height / 2 * (1 / zoom - 1 / prev);
      setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
    }
    zoomRef.current = zoom;
  }, [zoom, setOffset]);

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
          zoom: zoomRef.current,
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
    applyZoom(zoomRef.current * factor);
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
      <div className="zoom-controls" onPointerDown={e => e.stopPropagation()}>
        <button onClick={() => applyZoom(zoomRef.current * 0.9)} title="Zoom Out">
          <i className="fa-solid fa-magnifying-glass-minus" />
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
