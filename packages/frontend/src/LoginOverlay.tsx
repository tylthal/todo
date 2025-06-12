import React, { useContext } from 'react';
import { UserContext } from './UserContext';
import './App.css';

/** Overlay prompting the user to sign in. */
const LoginOverlay: React.FC = () => {
  const { login } = useContext(UserContext);

  return (
    <div className="login-overlay">
      <div className="login-panel">
        <p>Sign in to start using Sticky Notes</p>
        <button onClick={login}>Sign In</button>
      </div>
    </div>
  );
};

export default LoginOverlay;
