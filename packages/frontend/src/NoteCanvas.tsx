import React from 'react';
import { StickyNote } from './StickyNote';
import './App.css';
import { Note } from './App';

export interface NoteCanvasProps {
  notes: Note[];
  onUpdate: (id: number, data: Partial<Note>) => void;
  onArchive: (id: number) => void;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

export const NoteCanvas: React.FC<NoteCanvasProps> = ({
  notes,
  onUpdate,
  onArchive,
  selectedId,
  onSelect
}) => {
  return (
    <div className="board" onPointerDown={() => onSelect(null)}>
      <div className="notes">
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
