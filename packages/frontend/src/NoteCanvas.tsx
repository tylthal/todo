import React from 'react';
import { StickyNote } from './StickyNote';
import './App.css';
import { Note } from './App';

export interface NoteCanvasProps {
  notes: Note[];
  onDelete: (id: number) => void;
  onUpdate: (id: number, data: Partial<Note>) => void;
  onArchive: (id: number) => void;
}

export const NoteCanvas: React.FC<NoteCanvasProps> = ({
  notes,
  onDelete,
  onUpdate,
  onArchive
}) => {
  return (
    <div className="board">
      <div className="notes">
        {notes.map(note => (
          <StickyNote
            key={note.id}
            note={note}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onArchive={onArchive}
          />
        ))}
      </div>
    </div>
  );
};
