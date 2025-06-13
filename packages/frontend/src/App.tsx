import React, { useEffect, useState, useRef, useContext } from "react";
import { useDialog } from './DialogService';
import PromptDialog from './PromptDialog';
import ConfirmDialog from './ConfirmDialog';
import { UserProvider, UserContext } from './UserContext';
import { AccountControls } from './AccountControls';
import { NoteCanvas } from './NoteCanvas';
import LoginOverlay from './LoginOverlay';
import { KeyWatcher } from "./services/KeyWatcher";
import { appService, AppState, Note } from './services/AppService';
import './App.css';

// Component containing the main application logic. It is rendered inside
// {@link UserProvider} so that we can consume {@link UserContext}.
const AppContent: React.FC = () => {
  const { user } = useContext(UserContext);
  const selectedRef = useRef<number | null>(null);
  const [appState, setAppState] = useState<AppState>(appService.getState());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const dialog = useDialog();

  useEffect(() => appService.subscribe(setAppState), []);
  useEffect(() => { selectedRef.current = selectedId; }, [selectedId]);

  const { workspaces, currentWorkspaceId } = appState;

  const currentWsIndex = workspaces.findIndex(w => w.id === currentWorkspaceId);
  const workspace = workspaces[currentWsIndex];
  const snapToEdges = workspace.canvas.snapToEdges;

  const addNote = () => {
    appService.addNote();
  };

  const updateNote = (id: number, data: Partial<Note>) => {
    appService.updateNote(id, data);
  };

  const setNotePinned = (id: number, pinned: boolean) => {
    appService.setNotePinned(id, pinned);
  };

  const setNoteLocked = (id: number, locked: boolean) => {
    appService.setNoteLocked(id, locked);
  };

  const deleteNote = (id: number) => {
    appService.deleteNote(id);
  };

  const handleSelect = (id: number | null) => {
    if (id === null) {
      setSelectedId(null);
      return;
    }
    setSelectedId(id);
    const note = workspace.notes.find(n => n.id === id);
    if (note && !note.pinned) {
      appService.bringNoteToFront(id);
    }
  };
  useEffect(() => {
    const watcher = new KeyWatcher(appService, {
      getSelectedId: () => selectedRef.current,
      selectNote: handleSelect,
    });
    watcher.start();
    return () => watcher.stop();
  }, []);

  const toggleShowArchived = () => {
    setShowArchived(prev => !prev);
  };

  const toggleSnapToEdges = () => {
    appService.setSnapToEdges(!snapToEdges);
  };

  const setOffset = (pos: { x: number; y: number }) => {
    appService.setOffset(pos);
  };

  const setZoom = (z: number) => {
    appService.setZoom(z);
  };

  const createWorkspace = async () => {
    try {
      const name = await dialog.open<string>((close) => (
        <PromptDialog
          title="Workspace name"
          onConfirm={(val) => close.resolve(val)}
          onCancel={close.reject}
        />
      ));
      if (!name || name.trim() === '') return;
      await dialog.open<void>((close) => (
        <ConfirmDialog
          title="Create Workspace"
          message={`Create workspace "${name.trim()}"?`}
          confirmLabel="Create"
          onConfirm={() => close.resolve()}
          onCancel={close.reject}
        />
      ));
      appService.createWorkspace(name.trim());
      setSelectedId(null);
    } catch {
      /* cancelled */
    }
  };

  const deleteWorkspace = (id: number) => {
    appService.deleteWorkspace(id);
    setSelectedId(null);
  };

  const renameWorkspace = async (id: number) => {
    const ws = workspaces.find(w => w.id === id);
    if (!ws || ws.id === 1) return;
    try {
      const name = await dialog.open<string>((close) => (
        <PromptDialog
          title="Workspace name"
          defaultValue={ws.name}
          onConfirm={(val) => close.resolve(val)}
          onCancel={close.reject}
        />
      ));
      if (!name || name.trim() === '') return;
      appService.renameWorkspace(id, name.trim());
    } catch {
      /* user cancelled */
    }
  };

  const switchWorkspace = (id: number) => {
    appService.switchWorkspace(id);
    setSelectedId(null);
  };


  if (!user) {
    return <LoginOverlay />;
  }

  return (
    <div className="app">
        <AccountControls
          onAddNote={addNote}
          showArchived={showArchived}
          onToggleShowArchived={toggleShowArchived}
          snapToEdges={snapToEdges}
          onToggleSnap={toggleSnapToEdges}
          workspaces={workspaces.map(w => ({ id: w.id, name: w.name }))}
          currentWorkspaceId={currentWorkspaceId}
          onCreateWorkspace={createWorkspace}
          onSwitchWorkspace={switchWorkspace}
          onRenameWorkspace={renameWorkspace}
          onDeleteWorkspace={deleteWorkspace}
        />
        <NoteCanvas
          notes={workspace.notes.filter(n => showArchived || !n.archived)}
          onUpdate={updateNote}
          onArchive={(id, archived) => appService.archiveNote(id, archived)}
          onSetPinned={setNotePinned}
          onSetLocked={setNoteLocked}
          onDelete={deleteNote}
          selectedId={selectedId}
          onSelect={handleSelect}
          offset={workspace.canvas.offset}
          setOffset={setOffset}
          zoom={workspace.canvas.zoom}
          setZoom={setZoom}
          snapToEdges={snapToEdges}
          />
      </div>
  );
};

const App: React.FC = () => (
  <UserProvider>
    <AppContent />
  </UserProvider>
);

export default App;
