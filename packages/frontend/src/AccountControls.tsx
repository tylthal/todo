import React, { useContext } from 'react';
import { UserContext } from './UserContext';
import './App.css';

export interface AccountControlsProps {
  onAddNote: () => void;
  showArchived: boolean;
  onToggleShowArchived: () => void;
}
export const AccountControls: React.FC<AccountControlsProps> = ({ onAddNote, showArchived, onToggleShowArchived }) => {
  const { user, login, logout } = useContext(UserContext);

  return (
    <div className="account">
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
  );
};
