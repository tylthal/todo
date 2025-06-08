import React, { useRef, useState } from 'react';
import SimpleMdeReact from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import { Note } from './App';

export interface StickyNoteProps {
  note: Note;
  onUpdate: (id: number, data: Partial<Note>) => void;
  onArchive: (id: number) => void;
}

export const StickyNote: React.FC<StickyNoteProps> = ({ note, onUpdate, onArchive }) => {
  const modeRef = useRef<'drag' | 'resize' | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const pointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) {
      modeRef.current = 'resize';
    } else if (!target.closest('.editor-toolbar')) {
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

  const handleChange = (value: string) => {
    onUpdate(note.id, { content: value });
  };

  return (
    <div
      className="note"
      style={{ left: note.x, top: note.y, width: note.width, height: note.height }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
    >
      <button className="archive" onClick={() => onArchive(note.id)} title="Archive"><i className="fa fa-box-archive" /></button>
      <SimpleMdeReact
        value={note.content}
        onChange={handleChange}
        options={{
          spellChecker: false,
          status: false,
          toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "preview"],
        }}
      />
      <div className="resize-handle" />
    </div>
  );
};
