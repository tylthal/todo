import React, { useState } from 'react';
import { UserProvider } from './UserContext';
import { AccountControls } from './AccountControls';
import { NoteCanvas } from './NoteCanvas';
import './App.css';

export interface Note {
  id: number;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  archived: boolean;
}

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const addNote = () => {
    const id = Date.now();
    setNotes([
      ...notes,
      {
        id,
        content: '',
        x: 40,
        y: 40,
        width: 150,
        height: 120,
        archived: false
      }
    ]);
  };

  const updateNote = (id: number, data: Partial<Note>) => {
    setNotes(notes.map(n => (n.id === id ? { ...n, ...data } : n)));
  };


  return (
    <UserProvider>
      <div className="app">
        <AccountControls onAddNote={addNote} />
        <NoteCanvas
          notes={notes.filter(n => !n.archived)}
          onUpdate={updateNote}
          onArchive={(id) => updateNote(id, { archived: true })}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
    </UserProvider>
  );
};

export default App;
