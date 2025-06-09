import React, { useContext } from 'react';
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
        <button onClick={onToggleShowArchived}>{showArchived ? 'Hide Archived' : 'Show Archived'}</button>
        {user ? (
          <>
            <span className="welcome">Hello, {user.name}</span>
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <button onClick={login}>Login</button>
        )}
      </div>
    </div>
  );
};
