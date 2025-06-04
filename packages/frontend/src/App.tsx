import React from 'react';
import { UserProvider } from './UserContext';
import { AccountControls } from './AccountControls';
import { NoteCanvas } from './NoteCanvas';
import './App.css';

const App: React.FC = () => {
  return (
    <UserProvider>
      <div className="app">
        <AccountControls />
        <NoteCanvas />
      </div>
    </UserProvider>
  );
};

export default App;
