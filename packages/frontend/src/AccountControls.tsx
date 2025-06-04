import React, { useContext } from 'react';
import { UserContext } from './UserContext';
import './App.css';

export const AccountControls: React.FC = () => {
  const { user, login, logout } = useContext(UserContext);

  return (
    <div className="account">
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
