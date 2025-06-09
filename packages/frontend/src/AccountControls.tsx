import React, { useContext } from 'react';
import { UserContext } from './UserContext';
import './App.css';

export interface AccountControlsProps {
  onAddNote: () => void;
}
export const AccountControls: React.FC<AccountControlsProps> = ({ onAddNote }) => {
  const { user, login, logout } = useContext(UserContext);

  return (
    <div className="account">
      <button className="add-note" onClick={onAddNote}><i className="fa-solid fa-plus" /> Add Note</button>
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
