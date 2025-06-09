import React, { useState } from 'react';
import { UserProvider } from './UserContext';
import { AccountControls, WorkspaceInfo } from './AccountControls';
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

interface Workspace {
  id: number;
  name: string;
  notes: Note[];
  offset: { x: number; y: number };
  zoom: number;
  zCounter: number;
}

const App: React.FC = () => {
  const defaultWorkspace: Workspace = {
    id: 1,
    name: 'Default',
    notes: [],
    offset: { x: 0, y: 0 },
    zoom: 1,
    zCounter: 0,
  };

  const [workspaces, setWorkspaces] = useState<Workspace[]>([defaultWorkspace]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<number>(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const currentWsIndex = workspaces.findIndex(w => w.id === currentWorkspaceId);
  const workspace = workspaces[currentWsIndex];

  const addNote = () => {
    if (!workspace) return;
    const id = Date.now();
    const newZ = workspace.zCounter + 1;
    const newNote: Note = {
      id,
      content: '',
      x: (-workspace.offset.x + 40) / workspace.zoom,
      y: (-workspace.offset.y + 40) / workspace.zoom,
      width: 150,
      height: 120,
      archived: false,
      color: '#fef08a',
      zIndex: newZ,
    };
    setWorkspaces(ws =>
      ws.map((w, i) =>
        i === currentWsIndex ? { ...w, notes: [...w.notes, newNote], zCounter: newZ } : w
      )
    );
  };

  const updateNote = (id: number, data: Partial<Note>) => {
    setWorkspaces(ws =>
      ws.map((w, i) =>
        i === currentWsIndex
          ? { ...w, notes: w.notes.map(n => (n.id === id ? { ...n, ...data } : n)) }
          : w
      )
    );
  };

  const handleSelect = (id: number | null) => {
    if (id === null) {
      setSelectedId(null);
      return;
    }
    const newZ = workspace.zCounter + 1;
    setSelectedId(id);
    setWorkspaces(ws =>
      ws.map((w, i) =>
        i === currentWsIndex
          ? {
              ...w,
              zCounter: newZ,
              notes: w.notes.map(n => (n.id === id ? { ...n, zIndex: newZ } : n)),
            }
          : w
      )
    );
  };

  const toggleShowArchived = () => {
    setShowArchived(prev => !prev);
  };

  const setOffset = (pos: { x: number; y: number }) => {
    setWorkspaces(ws =>
      ws.map((w, i) => (i === currentWsIndex ? { ...w, offset: pos } : w))
    );
  };

  const setZoom = (z: number) => {
    setWorkspaces(ws =>
      ws.map((w, i) => (i === currentWsIndex ? { ...w, zoom: z } : w))
    );
  };

  const createWorkspace = () => {
    const id = Date.now();
    const newWs: Workspace = {
      id,
      name: `Workspace ${workspaces.length + 1}`,
      notes: [],
      offset: { x: 0, y: 0 },
      zoom: 1,
      zCounter: 0,
    };
    setWorkspaces(ws => [...ws, newWs]);
    setCurrentWorkspaceId(id);
    setSelectedId(null);
  };

  const switchWorkspace = (id: number) => {
    setCurrentWorkspaceId(id);
    setSelectedId(null);
  };


  return (
    <UserProvider>
      <div className="app">
        <AccountControls
          onAddNote={addNote}
          showArchived={showArchived}
          onToggleShowArchived={toggleShowArchived}
          workspaces={workspaces.map(w => ({ id: w.id, name: w.name }))}
          currentWorkspaceId={currentWorkspaceId}
          onCreateWorkspace={createWorkspace}
          onSwitchWorkspace={switchWorkspace}
        />
        <NoteCanvas
          notes={workspace.notes.filter(n => showArchived || !n.archived)}
          onUpdate={updateNote}
          onArchive={(id, archived) => updateNote(id, { archived })}
          selectedId={selectedId}
          onSelect={handleSelect}
          offset={workspace.offset}
          setOffset={setOffset}
          zoom={workspace.zoom}
          setZoom={setZoom}
        />
      </div>
    </UserProvider>
  );
};

export default App;
