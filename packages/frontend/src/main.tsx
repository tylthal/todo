import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => <div>Sticky Notes App</div>;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
