import React, { useState } from 'react';
import './App.css';

interface Note {
  id: number;
  text: string;
}

const App: React.FC = () => {
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
      <h1>Sticky Notes</h1>
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
          <div key={note.id} className="note">
            <button className="delete" onClick={() => removeNote(note.id)}>
              &times;
            </button>
            <p>{note.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
