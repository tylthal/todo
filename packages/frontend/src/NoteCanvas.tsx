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
}

export const NoteCanvas: React.FC<NoteCanvasProps> = ({
  notes,
  onUpdate,
  onArchive,
  selectedId,
  onSelect,
  offset,
  setOffset
}) => {
  const panRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const [panning, setPanning] = useState(false);

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
  };

  const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panRef.current) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    setOffset({ x: panRef.current.startOffsetX + dx, y: panRef.current.startOffsetY + dy });
  };

  const pointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    panRef.current = null;
    setPanning(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div
      className={`board${panning ? ' panning' : ''}`}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
    >
      <div className="notes" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
        {notes.map(note => (
          <StickyNote
            key={note.id}
            note={note}
            onUpdate={onUpdate}
            onArchive={onArchive}
            selected={selectedId === note.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};
