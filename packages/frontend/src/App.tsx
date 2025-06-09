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
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showArchived, setShowArchived] = useState(false);

  const addNote = () => {
    const id = Date.now();
    const newZ = zCounter + 1;
    setZCounter(newZ);
    setNotes([
      ...notes,
      {
        id,
        content: '',
        // Place the new note near the top-left corner of the visible
        // viewport regardless of the current zoom level.
        x: (-offset.x + 40) / zoom,
        y: (-offset.y + 40) / zoom,
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

  const toggleShowArchived = () => {
    setShowArchived(prev => !prev);
  };


  return (
    <UserProvider>
      <div className="app">
        <AccountControls
          onAddNote={addNote}
          showArchived={showArchived}
          onToggleShowArchived={toggleShowArchived}
        />
        <NoteCanvas
          notes={notes.filter(n => showArchived || !n.archived)}
          onUpdate={updateNote}
          onArchive={(id, archived) => updateNote(id, { archived })}
          selectedId={selectedId}
          onSelect={handleSelect}
          offset={offset}
          setOffset={setOffset}
          zoom={zoom}
          setZoom={setZoom}
        />
      </div>
    </UserProvider>
  );
};

export default App;
