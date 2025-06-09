import React, { useContext } from 'react';
import { UserContext } from './UserContext';
import './App.css';

export interface WorkspaceInfo {
  id: number;
  name: string;
}

export interface AccountControlsProps {
  onAddNote: () => void;
  showArchived: boolean;
  onToggleShowArchived: () => void;
  workspaces: WorkspaceInfo[];
  currentWorkspaceId: number;
  onCreateWorkspace: () => void;
  onSwitchWorkspace: (id: number) => void;
  onRenameWorkspace: (id: number) => void;
}
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
  const { user, login, logout } = useContext(UserContext);

  return (
    <div className="account">
      <div className="workspace-controls">
        <select
          value={currentWorkspaceId}
          onChange={e => {
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
