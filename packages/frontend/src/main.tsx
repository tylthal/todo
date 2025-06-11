import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DialogProvider } from './DialogService';
import './index.css';

// Some third-party libraries such as `buffer` expect a Node-style `global`
// object to exist. Vite's static `define` alias handles most cases during the
// build step, but runtime code may still reference `global`. Explicitly
// assigning `window` ensures those libraries work in the browser.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).global = window;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <DialogProvider>
      <App />
    </DialogProvider>
  </React.StrictMode>
);
