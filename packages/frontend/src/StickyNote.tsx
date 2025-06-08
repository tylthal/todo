import React, { useRef, useState } from 'react';
import { Note } from './App';

const adjustColor = (color: string, amount: number) => {
  let c = color.startsWith('#') ? color.slice(1) : color;
  if (c.length === 3) {
    c = c.split('').map(ch => ch + ch).join('');
  }
  const num = parseInt(c, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0xff) + amount;
  let b = (num & 0xff) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export interface StickyNoteProps {
  note: Note;
  onUpdate: (id: number, data: Partial<Note>) => void;
  onArchive: (id: number) => void;
  selected: boolean;
  onSelect: (id: number) => void;
}

export const StickyNote: React.FC<StickyNoteProps> = ({ note, onUpdate, onArchive, selected, onSelect }) => {
  const modeRef = useRef<'drag' | 'resize' | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [editing, setEditing] = useState(false);

  const pointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onSelect(note.id);
    if (editing) return;
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) {
      modeRef.current = 'resize';
    } else {
      modeRef.current = 'drag';
      offsetRef.current = { x: e.clientX - note.x, y: e.clientY - note.y };
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editing) return;
    if (modeRef.current === 'drag') {
      onUpdate(note.id, { x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y });
    }
    if (modeRef.current === 'resize') {
      const newWidth = Math.max(80, e.clientX - note.x);
      const newHeight = Math.max(60, e.clientY - note.y);
      onUpdate(note.id, { width: newWidth, height: newHeight });
    }
  };

  const pointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    modeRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleChange = (value: string) => {
    onUpdate(note.id, { content: value });
  };

  return (
    <div
      className={`note${selected ? ' selected' : ''}`}
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        transform: `rotate(${note.rotation}deg)`,
        backgroundColor: note.color,
        borderColor: adjustColor(note.color, -30),
        zIndex: note.zIndex,
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onDoubleClick={() => setEditing(true)}
    >
      {selected && !editing && (
        <button className="archive" onClick={() => onArchive(note.id)} title="Archive">
          <i className="fa fa-box-archive" />
        </button>
      )}
      {selected && !editing && (
        <>
          <button
            className="rotate-handle"
            onClick={() => onUpdate(note.id, { rotation: note.rotation + 15 })}
            title="Rotate"
          >
            <i className="fa fa-rotate" />
          </button>
          <input
            type="color"
            className="color-picker"
            value={note.color}
            onChange={(e) => onUpdate(note.id, { color: e.target.value })}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect(note.id);
            }}
          />
        </>
      )}
      {editing ? (
        <textarea
          className="note-text"
          value={note.content}
          onChange={e => handleChange(e.target.value)}
          onBlur={() => setEditing(false)}
          autoFocus
        />
      ) : (
        <div className={`note-content${note.content ? '' : ' placeholder'}`}>{note.content || 'Empty Note'}</div>
      )}
      {selected && !editing && <div className="resize-handle" />}
    </div>
  );
};
