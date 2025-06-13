import React, { useContext, useRef, useState, useEffect } from 'react';
import { UserContext } from './UserContext';
import './App.css';

// Header area that displays workspace management controls and a simple
// authentication menu. It also exposes buttons for toggling archived notes and
// creating new sticky notes.

export interface WorkspaceInfo {
  id: number;
  name: string;
}

export interface AccountControlsProps {
  /** Callback fired when the "Add Note" button is pressed */
  onAddNote: () => void;
  /** Whether archived notes are currently visible */
  showArchived: boolean;
  /** Toggle the archived filter */
  onToggleShowArchived: () => void;
  /** List of available workspaces for the workspace selector */
  workspaces: WorkspaceInfo[];
  /** Id of the workspace currently being displayed */
  currentWorkspaceId: number;
  /** Create a new workspace */
  onCreateWorkspace: () => void;
  /** Switch to another workspace */
  onSwitchWorkspace: (id: number) => void;
  /** Rename the current workspace */
  onRenameWorkspace: (id: number) => void;
}
// Renders account actions and the workspace selector shown at the top of the UI.
export const AccountControls: React.FC<AccountControlsProps> = ({
  onAddNote,
  showArchived,
  onToggleShowArchived,
  workspaces,
  currentWorkspaceId,
  onCreateWorkspace,
  onSwitchWorkspace,
  onRenameWorkspace,
}) => {
  // Consume the simple user context so we can show login/logout buttons.
  const { user, login, logout } = useContext(UserContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div className="account">
      <div className="workspace-controls">
        <select
          value={currentWorkspaceId}
          onChange={e => {
            // Allow the user to switch workspaces from the dropdown. A special
            // "new" option creates a fresh workspace instead.
            const val = e.target.value;
            if (val === 'new') {
              onCreateWorkspace();
            } else {
              onSwitchWorkspace(Number(val));
            }
          }}
        >
          {workspaces.map(ws => (
            <option key={ws.id} value={ws.id}>{ws.name}</option>
          ))}
          <option value="new">{"<New Workspace>"}</option>
        </select>
        {currentWorkspaceId !== 1 && (
          <button
            onClick={() => onRenameWorkspace(currentWorkspaceId)}
            title="Rename Workspace"
          >
            <i className="fa-solid fa-pen" />
          </button>
        )}
      </div>
      <div className="account-actions">
        {/* Primary actions for the current workspace */}
        <button className="add-note" onClick={onAddNote}><i className="fa-solid fa-plus" /> Add Note</button>
        {user ? (
          <div ref={menuRef} className="user-menu">
            <button
              className="profile"
              onClick={() => setMenuOpen((o) => !o)}
              title="Account Menu"
            >
              <i className="fa-solid fa-user" />
            </button>
            {menuOpen && (
              <div className="user-dropdown">
                <button onClick={onToggleShowArchived}>
                  {showArchived ? 'Hide Archived' : 'Show Archived'}
                </button>
                <button
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={login}>Login</button>
        )}
      </div>
    </div>
  );
};
