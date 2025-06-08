import React, { useState } from 'react';
import { StickyNote } from './StickyNote';
import './App.css';

interface Note {
  id: number;
  text: string;
}

export const NoteCanvas: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);

  const addNote = () => {
    setNotes([...notes, { id: Date.now(), text: '' }]);
  };

  const removeNote = (id: number) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  const updateNote = (id: number, text: string) => {
    setNotes(notes.map(n => (n.id === id ? { ...n, text } : n)));
  };

  return (
    <div className="board">
      <div className="controls">
        <button onClick={addNote}>Add Note</button>
      </div>
      <div className="notes">
        {notes.map(note => (
          <StickyNote
            key={note.id}
            id={note.id}
            text={note.text}
            onDelete={removeNote}
            onUpdate={updateNote}
          />
        ))}
      </div>
    </div>
  );
};
