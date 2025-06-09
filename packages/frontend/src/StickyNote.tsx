import React, { useRef, useState } from 'react';
import { Note } from './App';
import { ColorPalette } from './ColorPalette';

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
  onArchive: (id: number, archived: boolean) => void;
  selected: boolean;
  onSelect: (id: number) => void;
}

export const StickyNote: React.FC<StickyNoteProps> = ({ note, onUpdate, onArchive, selected, onSelect }) => {
  const modeRef = useRef<'drag' | 'resize' | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const resizeRef = useRef({
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
  });
  const [editing, setEditing] = useState(false);

  const pointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onSelect(note.id);
    if (editing) return;
    const target = e.target as HTMLElement;
    if (target.closest('.resize-handle')) {
      modeRef.current = 'resize';
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: note.width,
        startHeight: note.height,
      };
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
      const dx = e.clientX - resizeRef.current.startX;
      const dy = e.clientY - resizeRef.current.startY;
      const newWidth = Math.max(80, resizeRef.current.startWidth + dx);
      const newHeight = Math.max(60, resizeRef.current.startHeight + dy);
      onUpdate(note.id, { width: newWidth, height: newHeight });
    }
  };

  const pointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    modeRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const pointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    modeRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleChange = (value: string) => {
    onUpdate(note.id, { content: value });
  };

  return (
    <div
      className={`note${note.archived ? ' archived' : ''}${selected ? ' selected' : ''}${editing ? ' editing' : ''}`}
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        backgroundColor: note.color,
        borderColor: adjustColor(note.color, -30),
        zIndex: note.zIndex,
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerCancel}
      onDoubleClick={() => setEditing(true)}
    >
      {selected && !editing && (
        <div className="note-controls">
          <button
            className="archive note-control"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => onArchive(note.id, !note.archived)}
            title={note.archived ? 'Unarchive' : 'Archive'}
          >
          <i className={`fa-solid ${note.archived ? 'fa-box-open' : 'fa-box-archive'}`} />
          </button>
          <ColorPalette
            value={note.color}
            onChange={(color) => onUpdate(note.id, { color })}
          />
          <div className="resize-handle note-control">
            <i className="fa-solid fa-up-right-and-down-left-from-center" />
          </div>
        </div>
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
    </div>
  );
};
