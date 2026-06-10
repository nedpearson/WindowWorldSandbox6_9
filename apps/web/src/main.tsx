import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';
import './styles/paper-form.css';

// ── PWA auto-update: reload page when new service worker takes over ──
// With registerType:'autoUpdate', Workbox calls skipWaiting()+clientsClaim()
// automatically. The controllerchange event fires when the new SW takes control.
// We reload so the page gets the new cached assets from the new SW.
// A short debounce prevents double-reloads on first install.
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
