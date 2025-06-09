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
  color: string;
  zIndex: number;
}

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [zCounter, setZCounter] = useState(0);

  const addNote = () => {
    const id = Date.now();
    const newZ = zCounter + 1;
    setZCounter(newZ);
    setNotes([
      ...notes,
      {
        id,
        content: '',
        x: 40,
        y: 40,
        width: 150,
        height: 120,
        archived: false,
        color: '#fef08a',
        zIndex: newZ,
      },
    ]);
  };

  const updateNote = (id: number, data: Partial<Note>) => {
    setNotes(notes.map(n => (n.id === id ? { ...n, ...data } : n)));
  };

  const handleSelect = (id: number | null) => {
    if (id === null) {
      setSelectedId(null);
      return;
    }
    const newZ = zCounter + 1;
    setZCounter(newZ);
    setSelectedId(id);
    setNotes(notes.map(n => (n.id === id ? { ...n, zIndex: newZ } : n)));
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
          onSelect={handleSelect}
        />
      </div>
    </UserProvider>
  );
};

export default App;
