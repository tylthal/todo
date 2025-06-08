import React, { useRef, useState } from 'react';
import { Note } from './App';

export interface StickyNoteProps {
  note: Note;
  onDelete: (id: number) => void;
  onUpdate: (id: number, data: Partial<Note>) => void;
  onArchive: (id: number) => void;
}

export const StickyNote: React.FC<StickyNoteProps> = ({ note, onDelete, onUpdate, onArchive }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(false);
  const modeRef = useRef<'drag' | 'resize' | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const pointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) {
      modeRef.current = 'resize';
    } else if (!target.closest('.toolbar')) {
      modeRef.current = 'drag';
      offsetRef.current = { x: e.clientX - note.x, y: e.clientY - note.y };
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
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

  const handleInput = () => {
    if (contentRef.current) {
      onUpdate(note.id, { content: contentRef.current.innerHTML });
    }
  };

  const exec = (cmd: string) => {
    document.execCommand(cmd);
  };

  return (
    <div
      className="note"
      style={{ left: note.x, top: note.y, width: note.width, height: note.height }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onClick={() => setSelected(true)}
    >
      {selected && (
        <div className="toolbar">
          <button onMouseDown={e => e.preventDefault()} onClick={() => exec('bold')}>B</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => exec('italic')}>I</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => exec('underline')}>U</button>
        </div>
      )}
      <button className="delete" onClick={() => onDelete(note.id)}>&times;</button>
      <button className="archive" onClick={() => onArchive(note.id)} title="Archive">&#128465;</button>
      <div
        ref={contentRef}
        className="note-text"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={() => setSelected(true)}
        onBlur={() => setSelected(false)}
        dangerouslySetInnerHTML={{ __html: note.content }}
      />
      <div className="resize-handle" />
    </div>
  );
};
