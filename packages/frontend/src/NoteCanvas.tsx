import React, { useState } from 'react';
import { StickyNote } from './StickyNote';
import './App.css';

interface Note {
  id: number;
  text: string;
}

export const NoteCanvas: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [input, setInput] = useState('');

  const addNote = () => {
    if (!input.trim()) return;
    setNotes([...notes, { id: Date.now(), text: input }]);
    setInput('');
  };

  const removeNote = (id: number) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  return (
    <div className="board">
      <h1>Universal Note Canvas</h1>
      <div className="controls">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Write a note..."
        />
        <button onClick={addNote}>Add</button>
      </div>
      <div className="notes">
        {notes.map(note => (
          <StickyNote key={note.id} id={note.id} text={note.text} onDelete={removeNote} />
        ))}
      </div>
    </div>
  );
};
