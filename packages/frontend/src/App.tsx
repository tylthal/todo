import React, { useEffect, useState } from 'react';
import { UserProvider } from './UserContext';
import { AccountControls } from './AccountControls';
import { NoteCanvas } from './NoteCanvas';
import { appService, AppState, Note } from './services/AppService';
import './App.css';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(appService.getState());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => appService.subscribe(setAppState), []);

  const { workspaces, currentWorkspaceId } = appState;

  const currentWsIndex = workspaces.findIndex(w => w.id === currentWorkspaceId);
  const workspace = workspaces[currentWsIndex];

  const addNote = () => {
    appService.addNote();
  };

  const updateNote = (id: number, data: Partial<Note>) => {
    appService.updateNote(id, data);
  };

  const handleSelect = (id: number | null) => {
    if (id === null) {
      setSelectedId(null);
      return;
    }
    setSelectedId(id);
    appService.bringNoteToFront(id);
  };

  const toggleShowArchived = () => {
    setShowArchived(prev => !prev);
  };

  const setOffset = (pos: { x: number; y: number }) => {
    appService.setOffset(pos);
  };

  const setZoom = (z: number) => {
    appService.setZoom(z);
  };

  const createWorkspace = () => {
    appService.createWorkspace();
    setSelectedId(null);
  };

  const renameWorkspace = (id: number) => {
    const ws = workspaces.find(w => w.id === id);
    if (!ws || ws.id === 1) return;
    const name = window.prompt('Workspace name', ws.name);
    if (!name || name.trim() === '') return;
    appService.renameWorkspace(id, name.trim());
  };

  const switchWorkspace = (id: number) => {
    appService.switchWorkspace(id);
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
          onRenameWorkspace={renameWorkspace}
        />
        <NoteCanvas
          notes={workspace.notes.filter(n => showArchived || !n.archived)}
          onUpdate={updateNote}
          onArchive={(id, archived) => appService.archiveNote(id, archived)}
          selectedId={selectedId}
          onSelect={handleSelect}
          offset={workspace.canvas.offset}
          setOffset={setOffset}
          zoom={workspace.canvas.zoom}
          setZoom={setZoom}
        />
      </div>
    </UserProvider>
  );
};

export default App;
